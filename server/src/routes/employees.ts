import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/schema.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/employees - Fetch all or team employees (Admin sees all, Manager sees team)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { search, departmentId, status } = req.query;

    let query = `
      SELECT 
        e.*, 
        u.email, u.username, u.is_active as user_active,
        d.name as department_name,
        ws.name as schedule_name,
        m.first_name || ' ' || m.last_name as manager_name
      FROM employees e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN work_schedules ws ON e.schedule_id = ws.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Role filtering: Manager only sees team
    if (req.user?.role === 'MANAGER') {
      query += ` AND (e.manager_id = ? OR e.user_id = ?)`;
      params.push(req.user.employeeId || 0, req.user.id);
    }

    if (search) {
      query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR u.email LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (departmentId) {
      query += ` AND e.department_id = ?`;
      params.push(departmentId);
    }

    if (status) {
      query += ` AND e.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY e.id DESC`;

    const employees = await db.all(query, params);
    res.json(employees);
  } catch (err: any) {
    console.error('[GET Employees Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/employees/:id - Get employee details by ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    const employee = await db.get(`
      SELECT 
        e.*, 
        u.email, u.username, u.is_active as user_active, u.role_id, r.name as role_name,
        d.name as department_name,
        ws.name as schedule_name, ws.start_time, ws.end_time,
        m.first_name || ' ' || m.last_name as manager_name,
        os.is_enabled as overtime_enabled, os.overtime_hourly_rate, os.max_overtime_hours_per_day, os.rounding_mode
      FROM employees e
      JOIN users u ON e.user_id = u.id
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN work_schedules ws ON e.schedule_id = ws.id
      LEFT JOIN employees m ON e.manager_id = m.id
      LEFT JOIN overtime_settings os ON e.id = os.employee_id
      WHERE e.id = ?
    `, [id]);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Role Access Check: Employee can only view self, Manager can only view team or self
    if (req.user?.role === 'EMPLOYEE' && req.user.employeeId !== Number(id)) {
      return res.status(403).json({ error: 'Forbidden: Access denied' });
    }

    if (req.user?.role === 'MANAGER' && employee.manager_id !== req.user.employeeId && req.user.employeeId !== Number(id)) {
      return res.status(403).json({ error: 'Forbidden: Cannot access employee outside assigned team' });
    }

    res.json(employee);
  } catch (err: any) {
    console.error('[GET Employee Details Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/employees - Create new user & employee profile (Admin only)
router.post('/', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      username,
      password,
      roleId = 3, // Default EMPLOYEE
      phone,
      departmentId,
      managerId,
      scheduleId = 1,
      jobTitle,
      hireDate,
      basicSalary = 0,
      hourlyRate = 0,
    } = req.body;

    if (!firstName || !lastName || !email || !username || !password) {
      return res.status(400).json({ error: 'First Name, Last Name, Email, Username, and Password are required' });
    }

    const db = await getDb();

    // Check duplicate email or username
    const existing = await db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existing) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Insert into users
    const userResult = await db.run(
      'INSERT INTO users (role_id, username, email, password_hash) VALUES (?, ?, ?, ?)',
      [roleId, username, email, passwordHash]
    );

    const userId = userResult.lastID;
    const employeeCode = `EMP-${String(userId).padStart(3, '0')}`;

    // Insert into employees
    const empResult = await db.run(`
      INSERT INTO employees (
        user_id, employee_code, first_name, last_name, phone, 
        department_id, manager_id, schedule_id, job_title, hire_date, basic_salary, hourly_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId, employeeCode, firstName, lastName, phone,
      departmentId || null, managerId || null, scheduleId, jobTitle, hireDate || new Date().toISOString().split('T')[0], basicSalary, hourlyRate
    ]);

    const employeeId = empResult.lastID;

    // Create default overtime setting
    await db.run(`
      INSERT INTO overtime_settings (employee_id, is_enabled, overtime_hourly_rate, max_overtime_hours_per_day)
      VALUES (?, 1, ?, 3.0)
    `, [employeeId, hourlyRate]);

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (user_id, action, target_entity, target_id, details) VALUES (?, "CREATE_EMPLOYEE", "employees", ?, ?)',
      [req.user?.id, employeeId, JSON.stringify({ name: `${firstName} ${lastName}`, email, roleId })]
    );

    res.status(201).json({
      message: 'Employee created successfully',
      employeeId,
      employeeCode,
    });
  } catch (err: any) {
    console.error('[POST Employee Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/employees/:id - Edit employee profile details
router.put('/:id', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      phone,
      departmentId,
      managerId,
      scheduleId,
      jobTitle,
      hireDate,
      basicSalary,
      hourlyRate,
      status
    } = req.body;

    const db = await getDb();

    const employee = await db.get('SELECT * FROM employees WHERE id = ?', [id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await db.run(`
      UPDATE employees SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        phone = COALESCE(?, phone),
        department_id = COALESCE(?, department_id),
        manager_id = COALESCE(?, manager_id),
        schedule_id = COALESCE(?, schedule_id),
        job_title = COALESCE(?, job_title),
        hire_date = COALESCE(?, hire_date),
        basic_salary = COALESCE(?, basic_salary),
        hourly_rate = COALESCE(?, hourly_rate),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      firstName, lastName, phone, departmentId, managerId, scheduleId, jobTitle, hireDate, basicSalary, hourlyRate, status, id
    ]);

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (user_id, action, target_entity, target_id) VALUES (?, "UPDATE_EMPLOYEE", "employees", ?)',
      [req.user?.id, id]
    );

    res.json({ message: 'Employee updated successfully' });
  } catch (err: any) {
    console.error('[PUT Employee Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/employees/:id/status - Toggle employee active/deactivated status
router.patch('/:id/status', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE', 'INACTIVE', 'TERMINATED'

    const db = await getDb();

    const employee = await db.get('SELECT user_id FROM employees WHERE id = ?', [id]);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await db.run('UPDATE employees SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
    
    // Also update user active flag
    const isActive = status === 'ACTIVE' ? 1 : 0;
    await db.run('UPDATE users SET is_active = ? WHERE id = ?', [isActive, employee.user_id]);

    res.json({ message: `Employee status changed to ${status}` });
  } catch (err: any) {
    console.error('[PATCH Employee Status Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
