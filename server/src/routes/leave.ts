import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/leaves - Fetch leave requests (Role filtered)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { status } = req.query;

    let query = `
      SELECT 
        l.*,
        e.first_name, e.last_name, e.employee_code, e.job_title,
        d.name as department_name,
        u.username as decider_username
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON l.decision_by_user_id = u.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (req.user?.role === 'EMPLOYEE') {
      query += ` AND l.employee_id = ?`;
      params.push(req.user.employeeId || 0);
    } else if (req.user?.role === 'MANAGER') {
      query += ` AND (e.manager_id = ? OR e.user_id = ?)`;
      params.push(req.user.employeeId || 0, req.user.id);
    }

    if (status) {
      query += ` AND l.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY l.id DESC`;

    const requests = await db.all(query, params);
    res.json(requests);
  } catch (err: any) {
    console.error('[GET Leaves Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/leaves - Submit leave request
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { leaveType = 'ANNUAL', startDate, endDate, reason } = req.body;
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res.status(400).json({ error: 'User is not linked to an employee profile' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start Date and End Date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return res.status(400).json({ error: 'End Date cannot be before Start Date' });
    }

    // Calculate duration in days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const db = await getDb();

    // Check for overlapping pending/approved leaves
    const overlap = await db.get(`
      SELECT id FROM leave_requests 
      WHERE employee_id = ? AND status IN ('PENDING', 'APPROVED')
      AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?))
    `, [employeeId, endDate, startDate, startDate, endDate]);

    if (overlap) {
      return res.status(400).json({ error: 'You already have an active leave request overlapping these dates' });
    }

    const result = await db.run(`
      INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, duration_days, reason, status)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
    `, [employeeId, leaveType, startDate, endDate, durationDays, reason || '']);

    // Create notification for Manager / Admin
    await db.run(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (1, "New Leave Request", ?, "LEAVE")',
      [`New leave request submitted by employee ID ${employeeId} for ${durationDays} days.`]
    );

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (user_id, action, target_entity, target_id, details) VALUES (?, "SUBMIT_LEAVE", "leave_requests", ?, ?)',
      [req.user?.id, result.lastID, JSON.stringify({ leaveType, startDate, endDate, durationDays })]
    );

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveId: result.lastID,
      durationDays,
    });
  } catch (err: any) {
    console.error('[POST Leave Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/leaves/:id/decision - Approve or Reject leave request (Manager / Admin)
router.patch('/:id/decision', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, managerComments } = req.body; // 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const db = await getDb();

    const leave = await db.get('SELECT * FROM leave_requests WHERE id = ?', [id]);
    if (!leave) {
      return res.status(404).json({ error: 'Leave request not found' });
    }

    // Manager scope check
    if (req.user?.role === 'MANAGER') {
      const emp = await db.get('SELECT manager_id, user_id FROM employees WHERE id = ?', [leave.employee_id]);
      if (!emp || (emp.manager_id !== req.user.employeeId && emp.user_id !== req.user.id)) {
        return res.status(403).json({ error: 'Forbidden: Cannot decide leave request for employee outside your team' });
      }
    }

    const nowIso = new Date().toISOString();

    await db.run(`
      UPDATE leave_requests SET
        status = ?,
        decision_by_user_id = ?,
        decision_date = ?,
        manager_comments = ?
      WHERE id = ?
    `, [status, req.user?.id, nowIso, managerComments || null, id]);

    // AUTOMATIC ATTENDANCE INTEGRATION:
    // If APPROVED, update/insert attendance entries for the leave dates to ON_LEAVE
    if (status === 'APPROVED') {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];

        const existingAtt = await db.get(
          'SELECT id FROM attendance WHERE employee_id = ? AND date = ?',
          [leave.employee_id, dateStr]
        );

        if (existingAtt) {
          await db.run(
            'UPDATE attendance SET status = "ON_LEAVE" WHERE id = ?',
            [existingAtt.id]
          );
        } else {
          await db.run(
            'INSERT INTO attendance (employee_id, date, status) VALUES (?, ?, "ON_LEAVE")',
            [leave.employee_id, dateStr]
          );
        }
      }
    }

    // Notify employee
    const empUser = await db.get('SELECT user_id FROM employees WHERE id = ?', [leave.employee_id]);
    if (empUser) {
      await db.run(
        'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, "LEAVE")',
        [empUser.user_id, `Leave Request ${status}`, `Your leave request for ${leave.start_date} to ${leave.end_date} was ${status.toLowerCase()}.`]
      );
    }

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (user_id, action, target_entity, target_id, details) VALUES (?, "DECIDE_LEAVE", "leave_requests", ?, ?)',
      [req.user?.id, id, JSON.stringify({ status, managerComments })]
    );

    res.json({ message: `Leave request ${status.toLowerCase()} successfully` });
  } catch (err: any) {
    console.error('[PATCH Leave Decision Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
