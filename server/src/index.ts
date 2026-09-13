import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import departmentRoutes from './routes/departments.js';
import scheduleRoutes from './routes/schedules.js';
import attendanceRoutes from './routes/attendance.js';
import overtimeRoutes from './routes/overtime.js';
import leaveRoutes from './routes/leave.js';
import dashboardRoutes from './routes/dashboard.js';
import { getDb } from './db/schema.js';
import { seedDatabase } from './db/seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Database & Seed
getDb().then(async () => {
  console.log('[Database] Schema initialized.');
  await seedDatabase();
}).catch(err => {
  console.error('[Database Error]', err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/overtime-settings', overtimeRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Workforce Management System API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`[Workforce Server] Running on http://localhost:${PORT}`);
});
