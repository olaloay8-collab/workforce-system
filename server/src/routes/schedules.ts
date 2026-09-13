import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/schedules - Fetch all work schedule templates
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const schedules = await db.all(`
      SELECT ws.*, 
             (SELECT COUNT(*) FROM employees e WHERE e.schedule_id = ws.id) as assigned_employee_count
      FROM work_schedules ws
      ORDER BY ws.id ASC
    `);

    // Parse JSON working_days string
    const formatted = schedules.map((s) => ({
      ...s,
      working_days: typeof s.working_days === 'string' ? JSON.parse(s.working_days) : s.working_days,
    }));

    res.json(formatted);
  } catch (err: any) {
    console.error('[GET Schedules Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/schedules - Create new work schedule (Admin only)
router.post('/', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      startTime,
      endTime,
      workingDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      gracePeriodMinutes = 15,
      minRequiredHours = 8.0,
    } = req.body;

    if (!name || !startTime || !endTime) {
      return res.status(400).json({ error: 'Schedule Name, Start Time, and End Time are required' });
    }

    const db = await getDb();
    const result = await db.run(`
      INSERT INTO work_schedules (name, start_time, end_time, working_days, grace_period_minutes, min_required_hours)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      name, startTime, endTime, JSON.stringify(workingDays), gracePeriodMinutes, minRequiredHours
    ]);

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (user_id, action, target_entity, target_id, details) VALUES (?, "CREATE_SCHEDULE", "work_schedules", ?, ?)',
      [req.user?.id, result.lastID, JSON.stringify({ name, startTime, endTime })]
    );

    res.status(201).json({
      message: 'Work schedule created successfully',
      scheduleId: result.lastID,
    });
  } catch (err: any) {
    console.error('[POST Schedule Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/schedules/:id - Edit work schedule (Admin only)
router.put('/:id', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      startTime,
      endTime,
      workingDays,
      gracePeriodMinutes,
      minRequiredHours,
      status,
    } = req.body;

    const db = await getDb();

    const existing = await db.get('SELECT * FROM work_schedules WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    await db.run(`
      UPDATE work_schedules SET
        name = COALESCE(?, name),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        working_days = COALESCE(?, working_days),
        grace_period_minutes = COALESCE(?, grace_period_minutes),
        min_required_hours = COALESCE(?, min_required_hours),
        status = COALESCE(?, status)
      WHERE id = ?
    `, [
      name,
      startTime,
      endTime,
      workingDays ? JSON.stringify(workingDays) : null,
      gracePeriodMinutes,
      minRequiredHours,
      status,
      id,
    ]);

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (user_id, action, target_entity, target_id) VALUES (?, "UPDATE_SCHEDULE", "work_schedules", ?)',
      [req.user?.id, id]
    );

    res.json({ message: 'Work schedule updated successfully' });
  } catch (err: any) {
    console.error('[PUT Schedule Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/schedules/assign - Assign schedule to employee (Admin only)
router.patch('/assign', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, scheduleId } = req.body;
    if (!employeeId || !scheduleId) {
      return res.status(400).json({ error: 'Employee ID and Schedule ID are required' });
    }

    const db = await getDb();
    await db.run('UPDATE employees SET schedule_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [scheduleId, employeeId]);

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (user_id, action, target_entity, target_id, details) VALUES (?, "ASSIGN_SCHEDULE", "employees", ?, ?)',
      [req.user?.id, employeeId, JSON.stringify({ scheduleId })]
    );

    res.json({ message: 'Schedule assigned successfully' });
  } catch (err: any) {
    console.error('[PATCH Schedule Assign Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
