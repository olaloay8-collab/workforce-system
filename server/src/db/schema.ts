import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const dbPath = path.resolve(__dirname, '../../workforce.db');
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON;');

  // Create Tables
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      manager_id INTEGER,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS work_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      working_days TEXT NOT NULL,
      grace_period_minutes INTEGER DEFAULT 15,
      min_required_hours REAL DEFAULT 8.0,
      status INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      employee_code TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      department_id INTEGER,
      manager_id INTEGER,
      schedule_id INTEGER,
      job_title TEXT,
      hire_date TEXT,
      basic_salary REAL DEFAULT 0.0,
      hourly_rate REAL DEFAULT 0.0,
      status TEXT DEFAULT 'ACTIVE',
      profile_image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (schedule_id) REFERENCES work_schedules(id)
    );

    CREATE TABLE IF NOT EXISTS overtime_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER UNIQUE NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      overtime_start_time TEXT DEFAULT '16:00:00',
      overtime_hourly_rate REAL DEFAULT 5000.0,
      max_overtime_hours_per_day REAL DEFAULT 3.0,
      min_overtime_threshold_minutes INTEGER DEFAULT 15,
      rounding_mode TEXT DEFAULT 'EXACT',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      check_in DATETIME,
      check_out DATETIME,
      total_elapsed_minutes INTEGER DEFAULT 0,
      total_break_minutes INTEGER DEFAULT 0,
      actual_working_minutes INTEGER DEFAULT 0,
      regular_working_minutes INTEGER DEFAULT 0,
      overtime_minutes INTEGER DEFAULT 0,
      late_arrival_minutes INTEGER DEFAULT 0,
      early_departure_minutes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'NOT_STARTED',
      UNIQUE(employee_id, date),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS breaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_id INTEGER NOT NULL,
      break_start DATETIME NOT NULL,
      break_end DATETIME,
      duration_minutes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE',
      FOREIGN KEY (attendance_id) REFERENCES attendance(id)
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      duration_days REAL NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'PENDING',
      decision_by_user_id INTEGER,
      decision_date DATETIME,
      manager_comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (decision_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS payroll (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      pay_period TEXT NOT NULL,
      basic_salary REAL NOT NULL,
      total_overtime_hours REAL DEFAULT 0,
      total_overtime_pay REAL DEFAULT 0,
      bonuses REAL DEFAULT 0,
      deductions REAL DEFAULT 0,
      gross_salary REAL NOT NULL,
      net_salary REAL NOT NULL,
      status TEXT DEFAULT 'DRAFT',
      processed_at DATETIME,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'SYSTEM',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      target_entity TEXT,
      target_id INTEGER,
      details TEXT,
      ip_address TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return dbInstance;
}
