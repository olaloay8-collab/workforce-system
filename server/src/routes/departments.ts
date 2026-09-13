import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/departments
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const departments = await db.all(`
      SELECT d.*, 
             e.first_name || ' ' || e.last_name as manager_name,
             (SELECT COUNT(*) FROM employees emp WHERE emp.department_id = d.id) as employee_count
      FROM departments d
      LEFT JOIN employees e ON d.manager_id = e.id
      ORDER BY d.name ASC
    `);
    res.json(departments);
  } catch (err: any) {
    console.error('[GET Departments Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/departments (Admin only)
router.post('/', authenticateToken, requireRole(['ADMIN']), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, managerId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const db = await getDb();
    const result = await db.run(
      'INSERT INTO departments (name, description, manager_id) VALUES (?, ?, ?)',
      [name, description || null, managerId || null]
    );

    res.status(201).json({
      message: 'Department created successfully',
      departmentId: result.lastID,
    });
  } catch (err: any) {
    console.error('[POST Department Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
