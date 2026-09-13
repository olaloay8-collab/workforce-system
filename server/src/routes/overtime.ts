import { Router, Response } from 'express';
import { getDb } from '../db/schema.js';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper: Apply rounding mode rules
export function applyOvertimeRounding(rawMinutes: number, roundingMode: string): number {
  if (rawMinutes <= 0) return 0;

  switch (roundingMode) {
    case 'ROUND_DOWN':
      return Math.floor(rawMinutes / 60) * 60;
    case 'ROUND_UP':
      return Math.ceil(rawMinutes / 60) * 60;
    case 'NEAREST_15':
      return Math.round(rawMinutes / 15) * 15;
    case 'NEAREST_30':
      return Math.round(rawMinutes / 30) * 30;
    case 'EXACT':
    default:
      return rawMinutes;
  }
}

// GET /api/overtime-settings/:employeeId - Fetch employee-specific overtime settings
router.get('/:employeeId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const { employeeId } = req.params;

    const settings = await db.get(
      'SELECT * FROM overtime_settings WHERE employee_id = ?',
      [employeeId]
    );

    if (!settings) {
      // Return default configuration if not explicitly created yet
      return res.json({
        employee_id: Number(employeeId),
        is_enabled: 1,
        overtime_start_time: '16:00:00',
        overtime_hourly_rate: 5000.0,
        max_overtime_hours_per_day: 3.0,
        min_overtime_threshold_minutes: 15,
        rounding_mode: 'EXACT',
      });
    }

    res.json(settings);
  } catch (err: any) {
    console.error('[GET Overtime Settings Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/overtime-settings/:employeeId - Configure overtime settings for employee (Admin / Manager)
router.put('/:employeeId', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const {
      isEnabled,
      overtimeStartTime = '16:00:00',
      overtimeHourlyRate = 5000.0,
      maxOvertimeHoursPerDay = 3.0,
      minOvertimeThresholdMinutes = 15,
      roundingMode = 'EXACT',
    } = req.body;

    const db = await getDb();

    // Check manager authorization if role is MANAGER
    if (req.user?.role === 'MANAGER') {
      const employee = await db.get('SELECT manager_id, user_id FROM employees WHERE id = ?', [employeeId]);
      if (!employee || (employee.manager_id !== req.user.employeeId && employee.user_id !== req.user.id)) {
        return res.status(403).json({ error: 'Forbidden: Cannot configure overtime for employee outside your team' });
      }
    }

    const existing = await db.get('SELECT id FROM overtime_settings WHERE employee_id = ?', [employeeId]);

    if (existing) {
      await db.run(`
        UPDATE overtime_settings SET
          is_enabled = ?,
          overtime_start_time = ?,
          overtime_hourly_rate = ?,
          max_overtime_hours_per_day = ?,
          min_overtime_threshold_minutes = ?,
          rounding_mode = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE employee_id = ?
      `, [
        isEnabled ? 1 : 0,
        overtimeStartTime,
        overtimeHourlyRate,
        maxOvertimeHoursPerDay,
        minOvertimeThresholdMinutes,
        roundingMode,
        employeeId,
      ]);
    } else {
      await db.run(`
        INSERT INTO overtime_settings (
          employee_id, is_enabled, overtime_start_time, overtime_hourly_rate, 
          max_overtime_hours_per_day, min_overtime_threshold_minutes, rounding_mode
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        employeeId,
        isEnabled ? 1 : 0,
        overtimeStartTime,
        overtimeHourlyRate,
        maxOvertimeHoursPerDay,
        minOvertimeThresholdMinutes,
        roundingMode,
      ]);
    }

    // Audit Log
    await db.run(
      'INSERT INTO audit_logs (user_id, action, target_entity, target_id, details) VALUES (?, "UPDATE_OVERTIME_SETTINGS", "employees", ?, ?)',
      [req.user?.id, employeeId, JSON.stringify({ isEnabled, overtimeHourlyRate, roundingMode })]
    );

    res.json({ message: 'Overtime settings updated successfully' });
  } catch (err: any) {
    console.error('[PUT Overtime Settings Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/overtime-settings/calculate - Live Overtime Calculation Simulator
router.post('/calculate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      employeeId,
      rawOvertimeMinutes = 90, // e.g. 1h 30m
      overrideConfig,
    } = req.body;

    const db = await getDb();

    let config = overrideConfig;
    if (!config && employeeId) {
      config = await db.get('SELECT * FROM overtime_settings WHERE employee_id = ?', [employeeId]);
    }

    if (!config) {
      config = {
        is_enabled: 1,
        overtime_hourly_rate: 5000.0,
        max_overtime_hours_per_day: 3.0,
        min_overtime_threshold_minutes: 15,
        rounding_mode: 'EXACT',
      };
    }

    const isEnabled = config.is_enabled === 1 || config.isEnabled === true;
    const threshold = config.min_overtime_threshold_minutes || config.minOvertimeThresholdMinutes || 15;
    const rate = config.overtime_hourly_rate || config.overtimeHourlyRate || 5000.0;
    const maxHours = config.max_overtime_hours_per_day || config.maxOvertimeHoursPerDay || 3.0;
    const roundingMode = config.rounding_mode || config.roundingMode || 'EXACT';

    if (!isEnabled) {
      return res.json({
        rawOvertimeMinutes,
        roundedOvertimeMinutes: 0,
        overtimeHours: 0,
        overtimePay: 0,
        status: 'DISABLED',
        note: 'Overtime is disabled for this employee.',
      });
    }

    if (rawOvertimeMinutes < threshold) {
      return res.json({
        rawOvertimeMinutes,
        roundedOvertimeMinutes: 0,
        overtimeHours: 0,
        overtimePay: 0,
        status: 'BELOW_THRESHOLD',
        note: `Raw overtime (${rawOvertimeMinutes} mins) is below threshold (${threshold} mins).`,
      });
    }

    // Apply rounding rule
    let roundedMinutes = applyOvertimeRounding(rawOvertimeMinutes, roundingMode);

    // Apply max cap
    const maxCapMinutes = maxHours * 60;
    let isCapped = false;
    if (roundedMinutes > maxCapMinutes) {
      roundedMinutes = maxCapMinutes;
      isCapped = true;
    }

    const overtimeHours = roundedMinutes / 60;
    const overtimePay = overtimeHours * rate;

    res.json({
      rawOvertimeMinutes,
      roundedOvertimeMinutes: roundedMinutes,
      overtimeHours,
      overtimePay,
      rate,
      roundingMode,
      isCapped,
      status: 'CALCULATED',
      note: isCapped ? `Capped at max limit of ${maxHours} hours/day.` : 'Calculated successfully.',
    });
  } catch (err: any) {
    console.error('[Calculate Overtime Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
