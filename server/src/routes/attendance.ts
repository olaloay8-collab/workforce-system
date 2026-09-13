import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper: Format date to YYYY-MM-DD
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// GET /api/attendance/today - Get current day attendance status & active breaks for logged-in employee
router.get('/today', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res.status(400).json({ error: 'User is not linked to an employee profile' });
    }

    const today = getTodayDateString();

    const attendance = await db.get(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, today]
    );

    if (!attendance) {
      return res.json({
        status: 'NOT_STARTED',
        date: today,
        attendance: null,
        breaks: [],
      });
    }

    const breaks = await db.all(
      'SELECT * FROM breaks WHERE attendance_id = ? ORDER BY id ASC',
      [attendance.id]
    );

    const activeBreak = breaks.find((b) => b.status === 'ACTIVE');

    res.json({
      status: attendance.status,
      date: today,
      attendance,
      breaks,
      activeBreak: activeBreak || null,
    });
  } catch (err: any) {
    console.error('[GET Attendance Today Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/attendance/start-work - Punch In
router.post('/start-work', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res.status(400).json({ error: 'User is not linked to an employee profile' });
    }

    const today = getTodayDateString();

    // Prevent duplicate check-ins
    const existing = await db.get(
      'SELECT id FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, today]
    );

    if (existing) {
      return res.status(400).json({ error: 'Workday has already been started for today' });
    }

    // Fetch employee schedule for late arrival calculation
    const employee = await db.get(
      'SELECT e.*, ws.start_time, ws.grace_period_minutes FROM employees e JOIN work_schedules ws ON e.schedule_id = ws.id WHERE e.id = ?',
      [employeeId]
    );

    const now = new Date();
    const checkInIso = now.toISOString();

    let lateMinutes = 0;
    let initialStatus = 'WORKING';

    if (employee && employee.start_time) {
      const [schedH, schedM] = employee.start_time.split(':').map(Number);
      const schedStart = new Date(now);
      schedStart.setHours(schedH, schedM, 0, 0);

      const graceMs = (employee.grace_period_minutes || 15) * 60 * 1000;
      const allowedTime = new Date(schedStart.getTime() + graceMs);

      if (now > allowedTime) {
        lateMinutes = Math.floor((now.getTime() - schedStart.getTime()) / (1000 * 60));
        initialStatus = 'WORKING'; // Will be evaluated on completion or flagged as LATE
      }
    }

    const result = await db.run(`
      INSERT INTO attendance (employee_id, date, check_in, status, late_arrival_minutes)
      VALUES (?, ?, ?, ?, ?)
    `, [employeeId, today, checkInIso, initialStatus, lateMinutes]);

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (user_id, action, target_entity, target_id) VALUES (?, "START_WORK", "attendance", ?)',
      [req.user?.id, result.lastID]
    );

    res.status(201).json({
      message: 'Work started successfully',
      attendanceId: result.lastID,
      checkIn: checkInIso,
      status: initialStatus,
      lateMinutes,
    });
  } catch (err: any) {
    console.error('[Start Work Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/attendance/start-break - Start Break
router.post('/start-break', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const employeeId = req.user?.employeeId;
    const today = getTodayDateString();

    const attendance = await db.get(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, today]
    );

    if (!attendance) {
      return res.status(400).json({ error: 'Cannot start break: Workday has not been started' });
    }

    if (attendance.status === 'ON_BREAK') {
      return res.status(400).json({ error: 'Already on break' });
    }

    if (attendance.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Workday is already completed' });
    }

    const nowIso = new Date().toISOString();

    // Create break record
    const breakResult = await db.run(
      'INSERT INTO breaks (attendance_id, break_start, status) VALUES (?, ?, "ACTIVE")',
      [attendance.id, nowIso]
    );

    // Update attendance status to ON_BREAK
    await db.run(
      'UPDATE attendance SET status = "ON_BREAK" WHERE id = ?',
      [attendance.id]
    );

    res.json({
      message: 'Break started',
      breakId: breakResult.lastID,
      breakStart: nowIso,
    });
  } catch (err: any) {
    console.error('[Start Break Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/attendance/end-break - End Break
router.post('/end-break', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const employeeId = req.user?.employeeId;
    const today = getTodayDateString();

    const attendance = await db.get(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, today]
    );

    if (!attendance || attendance.status !== 'ON_BREAK') {
      return res.status(400).json({ error: 'No active break to end' });
    }

    const activeBreak = await db.get(
      'SELECT * FROM breaks WHERE attendance_id = ? AND status = "ACTIVE"',
      [attendance.id]
    );

    if (!activeBreak) {
      return res.status(400).json({ error: 'Active break record not found' });
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const startTime = new Date(activeBreak.break_start);
    const durationMinutes = Math.max(1, Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60)));

    // Update break record
    await db.run(
      'UPDATE breaks SET break_end = ?, duration_minutes = ?, status = "COMPLETED" WHERE id = ?',
      [nowIso, durationMinutes, activeBreak.id]
    );

    // Recalculate total break minutes on attendance
    const breakSum = await db.get(
      'SELECT SUM(duration_minutes) as total FROM breaks WHERE attendance_id = ? AND status = "COMPLETED"',
      [attendance.id]
    );

    const totalBreak = breakSum.total || 0;

    // Update attendance status back to WORKING
    await db.run(
      'UPDATE attendance SET status = "WORKING", total_break_minutes = ? WHERE id = ?',
      [totalBreak, attendance.id]
    );

    res.json({
      message: 'Break ended successfully',
      breakDuration: durationMinutes,
      totalBreakMinutes: totalBreak,
    });
  } catch (err: any) {
    console.error('[End Break Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/attendance/end-work - Punch Out & Compute Hours
router.post('/end-work', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const employeeId = req.user?.employeeId;
    const today = getTodayDateString();

    const attendance = await db.get(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, today]
    );

    if (!attendance) {
      return res.status(400).json({ error: 'Cannot end work: Workday has not been started' });
    }

    if (attendance.status === 'ON_BREAK') {
      return res.status(400).json({ error: 'Cannot end work while on break. Please end break first.' });
    }

    if (attendance.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Workday is already completed' });
    }

    const now = new Date();
    const checkOutIso = now.toISOString();
    const checkInTime = new Date(attendance.check_in);

    // Total elapsed minutes
    const totalElapsedMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / (1000 * 60));

    // Total break minutes
    const breakSum = await db.get(
      'SELECT SUM(duration_minutes) as total FROM breaks WHERE attendance_id = ? AND status = "COMPLETED"',
      [attendance.id]
    );
    const totalBreakMinutes = breakSum.total || 0;

    // Actual working minutes
    const actualWorkingMinutes = Math.max(0, totalElapsedMinutes - totalBreakMinutes);

    // Regular standard minutes (8 hours = 480 mins)
    const regularWorkingMinutes = Math.min(actualWorkingMinutes, 480);

    // Raw overtime minutes
    const rawOvertimeMinutes = Math.max(0, actualWorkingMinutes - 480);

    // Final Status (PRESENT or LATE)
    const finalStatus = attendance.late_arrival_minutes > 0 ? 'LATE' : 'PRESENT';

    // Update attendance record
    await db.run(`
      UPDATE attendance SET
        check_out = ?,
        total_elapsed_minutes = ?,
        total_break_minutes = ?,
        actual_working_minutes = ?,
        regular_working_minutes = ?,
        overtime_minutes = ?,
        status = ?
      WHERE id = ?
    `, [
      checkOutIso,
      totalElapsedMinutes,
      totalBreakMinutes,
      actualWorkingMinutes,
      regularWorkingMinutes,
      rawOvertimeMinutes,
      finalStatus,
      attendance.id,
    ]);

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (user_id, action, target_entity, target_id) VALUES (?, "END_WORK", "attendance", ?)',
      [req.user?.id, attendance.id]
    );

    res.json({
      message: 'Workday completed successfully',
      checkOut: checkOutIso,
      totalElapsedMinutes,
      totalBreakMinutes,
      actualWorkingMinutes,
      regularWorkingMinutes,
      overtimeMinutes: rawOvertimeMinutes,
      status: finalStatus,
    });
  } catch (err: any) {
    console.error('[End Work Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/attendance/history - Attendance history for logged in employee, manager team, or admin
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { employeeId, startDate, endDate } = req.query;

    let query = `
      SELECT 
        a.*,
        e.first_name, e.last_name, e.employee_code, e.job_title,
        d.name as department_name
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (req.user?.role === 'EMPLOYEE') {
      query += ` AND a.employee_id = ?`;
      params.push(req.user.employeeId || 0);
    } else if (req.user?.role === 'MANAGER') {
      query += ` AND (e.manager_id = ? OR e.user_id = ?)`;
      params.push(req.user.employeeId || 0, req.user.id);
    } else if (employeeId) {
      query += ` AND a.employee_id = ?`;
      params.push(employeeId);
    }

    if (startDate) {
      query += ` AND a.date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND a.date <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY a.date DESC, a.id DESC`;

    const records = await db.all(query, params);
    res.json(records);
  } catch (err: any) {
    console.error('[GET Attendance History Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
