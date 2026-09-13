import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db/schema.js';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Email/Username and Password are required' });
    }

    const db = await getDb();

    // Query user by email or username
    const user = await db.get(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.email = ? OR u.username = ?`,
      [emailOrUsername, emailOrUsername]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact Administrator.' });
    }

    // Verify password hash
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Fetch matching employee ID if available
    const employee = await db.get('SELECT id, first_name, last_name FROM employees WHERE user_id = ?', [user.id]);

    const payload = {
      id: user.id,
      roleId: user.role_id,
      role: user.role_name as 'ADMIN' | 'MANAGER' | 'EMPLOYEE',
      username: user.username,
      email: user.email,
      employeeId: employee?.id,
      name: employee ? `${employee.first_name} ${employee.last_name}` : user.username,
    };

    const token = generateToken(payload);

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (user_id, action, target_entity, details) VALUES (?, "LOGIN", "users", ?)',
      [user.id, JSON.stringify({ ip: req.ip, userAgent: req.headers['user-agent'] })]
    );

    res.json({
      message: 'Login successful',
      token,
      user: payload,
    });
  } catch (err: any) {
    console.error('[Login Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user) {
    const db = await getDb();
    await db.run(
      'INSERT INTO audit_logs (user_id, action, target_entity) VALUES (?, "LOGOUT", "users")',
      [req.user.id]
    );
  }
  res.json({ message: 'Logged out successfully' });
});

export default router;
