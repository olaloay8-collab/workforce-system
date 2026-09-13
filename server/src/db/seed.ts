import bcrypt from 'bcryptjs';
import { getDb } from './schema.js';

export async function seedDatabase() {
  const db = await getDb();

  // 1. Seed Roles
  const rolesCount = await db.get('SELECT COUNT(*) as count FROM roles');
  if (rolesCount.count === 0) {
    await db.run("INSERT INTO roles (id, name) VALUES (1, 'ADMIN'), (2, 'MANAGER'), (3, 'EMPLOYEE');");
  }

  // 2. Seed Departments
  const deptCount = await db.get('SELECT COUNT(*) as count FROM departments');
  if (deptCount.count === 0) {
    await db.run(`
      INSERT INTO departments (id, name, description) VALUES
      (1, 'Engineering', 'Software development and IT operations'),
      (2, 'Marketing', 'Brand strategies and advertising'),
      (3, 'Finance', 'Accounting and payroll management'),
      (4, 'HR', 'Human resources and talent acquisition'),
      (5, 'Sales', 'Client relations and business development');
    `);
  }

  // 3. Seed Work Schedules
  const schedCount = await db.get('SELECT COUNT(*) as count FROM work_schedules');
  if (schedCount.count === 0) {
    await db.run(`
      INSERT INTO work_schedules (id, name, start_time, end_time, working_days, grace_period_minutes, min_required_hours) VALUES
      (1, 'Standard Day Shift', '08:00:00', '16:00:00', '["Mon","Tue","Wed","Thu","Fri"]', 15, 8.0);
    `);
  }

  // 4. Seed Users & Employees
  const usersCount = await db.get('SELECT COUNT(*) as count FROM users');
  if (usersCount.count === 0) {
    const passwordHash = await bcrypt.hash('password123', 10);
    const adminHash = await bcrypt.hash('admin123', 10);

    // Admin User (ID 1)
    await db.run(
      'INSERT INTO users (id, role_id, username, email, password_hash) VALUES (1, 1, "admin", "admin@company.com", ?)',
      [adminHash]
    );

    // Manager User (ID 2)
    await db.run(
      'INSERT INTO users (id, role_id, username, email, password_hash) VALUES (2, 2, "manager", "manager@company.com", ?)',
      [passwordHash]
    );

    // Employee 1 User (ID 3 - Sara Ali)
    await db.run(
      'INSERT INTO users (id, role_id, username, email, password_hash) VALUES (3, 3, "sara", "sara@company.com", ?)',
      [passwordHash]
    );

    // Employee 2 User (ID 4 - Ahmed Hassan)
    await db.run(
      'INSERT INTO users (id, role_id, username, email, password_hash) VALUES (4, 3, "ahmed", "ahmed@company.com", ?)',
      [passwordHash]
    );

    // Seed Manager Profile (Employee ID 1)
    await db.run(`
      INSERT INTO employees (id, user_id, employee_code, first_name, last_name, phone, department_id, schedule_id, job_title, hire_date, basic_salary, hourly_rate)
      VALUES (1, 2, 'EMP-001', 'Alex', 'Vance', '+15550192', 1, 1, 'Engineering Lead', '2024-01-15', 1200000.0, 7500.0);
    `);

    // Seed Sara Ali Profile (Employee ID 2)
    await db.run(`
      INSERT INTO employees (id, user_id, employee_code, first_name, last_name, phone, department_id, manager_id, schedule_id, job_title, hire_date, basic_salary, hourly_rate)
      VALUES (2, 3, 'EMP-002', 'Sara', 'Ali', '+15550193', 1, 1, 1, 'Software Developer', '2024-03-01', 800000.0, 5000.0);
    `);

    // Seed Ahmed Hassan Profile (Employee ID 3)
    await db.run(`
      INSERT INTO employees (id, user_id, employee_code, first_name, last_name, phone, department_id, manager_id, schedule_id, job_title, hire_date, basic_salary, hourly_rate)
      VALUES (3, 4, 'EMP-003', 'Ahmed', 'Hassan', '+15550194', 2, 1, 1, 'Marketing Specialist', '2024-04-10', 750000.0, 4700.0);
    `);

    // Seed Overtime Settings
    await db.run(`
      INSERT INTO overtime_settings (employee_id, is_enabled, overtime_start_time, overtime_hourly_rate, max_overtime_hours_per_day, rounding_mode)
      VALUES 
      (2, 1, '16:00:00', 5000.0, 3.0, 'EXACT'),
      (3, 1, '16:00:00', 4700.0, 2.0, 'NEAREST_15');
    `);

    console.log('[Seed] Database seeded successfully with default users & records.');
  }
}
