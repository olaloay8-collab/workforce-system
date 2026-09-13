import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Timer, Save, AlertCircle, CheckCircle2, Calculator, ShieldCheck, DollarSign } from 'lucide-react';

export default function Overtime() {
  const { token, user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [config, setConfig] = useState({
    isEnabled: true,
    overtimeStartTime: '16:00',
    overtimeHourlyRate: 5000,
    maxOvertimeHoursPerDay: 3.0,
    minOvertimeThresholdMinutes: 15,
    roundingMode: 'EXACT',
  });

  // Simulator State
  const [simulatedEndTime, setSimulatedEndTime] = useState('17:30'); // 05:30 PM
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchOvertimeSettings(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    runLiveSimulation();
  }, [config, simulatedEndTime]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
        if (data.length > 0) {
          setSelectedEmployeeId(String(data[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to fetch employees', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOvertimeSettings = async (empId: string) => {
    try {
      const res = await fetch(`/api/overtime-settings/${empId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConfig({
          isEnabled: data.is_enabled === 1,
          overtimeStartTime: data.overtime_start_time ? data.overtime_start_time.slice(0, 5) : '16:00',
          overtimeHourlyRate: Number(data.overtime_hourly_rate || 5000),
          maxOvertimeHoursPerDay: Number(data.max_overtime_hours_per_day || 3.0),
          minOvertimeThresholdMinutes: Number(data.min_overtime_threshold_minutes || 15),
          roundingMode: data.rounding_mode || 'EXACT',
        });
      }
    } catch (err) {
      console.error('Failed to fetch overtime settings', err);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch(`/api/overtime-settings/${selectedEmployeeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isEnabled: config.isEnabled,
          overtimeStartTime: `${config.overtimeStartTime}:00`,
          overtimeHourlyRate: Number(config.overtimeHourlyRate),
          maxOvertimeHoursPerDay: Number(config.maxOvertimeHoursPerDay),
          minOvertimeThresholdMinutes: Number(config.minOvertimeThresholdMinutes),
          roundingMode: config.roundingMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save config');

      setMessage('Employee overtime rules updated successfully.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const runLiveSimulation = async () => {
    // Calculate raw minutes from 16:00 to simulatedEndTime
    const [startH, startM] = config.overtimeStartTime.split(':').map(Number);
    const [endH, endM] = simulatedEndTime.split(':').map(Number);

    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    const rawMinutes = Math.max(0, endTotal - startTotal);

    try {
      const res = await fetch('/api/overtime-settings/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: Number(selectedEmployeeId),
          rawOvertimeMinutes: rawMinutes,
          overrideConfig: config,
        }),
      });

      if (res.ok) {
        setSimResult(await res.json());
      }
    } catch (err) {
      console.error('Failed simulation', err);
    }
  };

  const selectedEmployee = employees.find((e) => String(e.id) === selectedEmployeeId);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Employee-Specific Overtime Engine</h2>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
          Configure individual overtime rules per employee (Overtime is NOT global).
        </p>
      </div>

      {/* Employee Selector Bar */}
      <div className="p-4 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <span className="font-semibold text-[#64748B]">Select Employee:</span>
          <select
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A] font-semibold min-w-[220px]"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name} ({emp.employee_code} — {emp.department_name || 'General'})
              </option>
            ))}
          </select>
        </div>

        {selectedEmployee && (
          <div className="flex items-center space-x-2">
            <span className="text-[#64748B]">Normal Schedule:</span>
            <span className="font-mono font-semibold text-brand-500 bg-[#F1F6FB] dark:bg-[#121A2A] px-2.5 py-1 rounded-md">
              08:00 AM → 04:00 PM
            </span>
          </div>
        )}
      </div>

      {/* Grid Settings & Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Overtime Configuration Form */}
        <div className="p-6 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle space-y-5 text-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
            <div className="flex items-center space-x-2">
              <Timer className="w-5 h-5 text-brand-500" />
              <h3 className="font-bold text-sm">Overtime Rules Configuration</h3>
            </div>
            <span className="text-[10px] text-[#64748B]">Employee ID: {selectedEmployeeId}</span>
          </div>

          {message && (
            <div className="p-3 rounded-apple-sm water-badge-green text-status-green flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-apple-sm water-badge-red text-status-red flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSaveConfig} className="space-y-4">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-3 rounded-apple-sm bg-[#F1F6FB] dark:bg-[#121A2A]">
              <div>
                <p className="font-semibold text-[#111827] dark:text-[#F8FAFC]">Enable Overtime</p>
                <p className="text-[10px] text-[#64748B]">Allow overtime calculation for this employee</p>
              </div>
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                className="w-4 h-4 text-brand-500 rounded accent-brand-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#64748B] mb-1">Overtime Starts After</label>
                <input
                  type="time"
                  value={config.overtimeStartTime}
                  onChange={(e) => setConfig({ ...config, overtimeStartTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#64748B] mb-1">Overtime Hourly Rate (IQD/hr)</label>
                <input
                  type="number"
                  value={config.overtimeHourlyRate}
                  onChange={(e) => setConfig({ ...config, overtimeHourlyRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#64748B] mb-1">Max Overtime (hours/day)</label>
                <input
                  type="number"
                  step="0.5"
                  value={config.maxOvertimeHoursPerDay}
                  onChange={(e) => setConfig({ ...config, maxOvertimeHoursPerDay: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#64748B] mb-1">Min Threshold (minutes)</label>
                <input
                  type="number"
                  value={config.minOvertimeThresholdMinutes}
                  onChange={(e) => setConfig({ ...config, minOvertimeThresholdMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#64748B] mb-1">Overtime Rounding Rule</label>
              <select
                value={config.roundingMode}
                onChange={(e) => setConfig({ ...config, roundingMode: e.target.value })}
                className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A] font-medium"
              >
                <option value="EXACT">Exact minutes (e.g., 62m = 1.033h)</option>
                <option value="ROUND_DOWN">Round down to full hours (e.g., 62m → 60m / 1.0h)</option>
                <option value="ROUND_UP">Round up to full hours (e.g., 62m → 120m / 2.0h)</option>
                <option value="NEAREST_15">Nearest 15 minutes (e.g., 62m → 60m / 1.0h)</option>
                <option value="NEAREST_30">Nearest 30 minutes (e.g., 62m → 60m / 1.0h)</option>
              </select>
            </div>

            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 rounded-apple-sm bg-brand-500 text-white font-medium text-xs flex items-center justify-center space-x-2 shadow-water"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Overtime Changes'}</span>
              </button>
            )}
          </form>
        </div>

        {/* Live Overtime Preview Calculator */}
        <div className="p-6 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle space-y-6 text-xs">
          <div className="flex items-center space-x-2 border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
            <Calculator className="w-5 h-5 text-status-amber" />
            <h3 className="font-bold text-sm">Live Overtime Simulation Preview</h3>
          </div>

          {/* Simulated Check-Out Time Input */}
          <div>
            <label className="block font-semibold text-[#64748B] mb-2">Simulate Employee Check-Out Time:</label>
            <input
              type="time"
              value={simulatedEndTime}
              onChange={(e) => setSimulatedEndTime(e.target.value)}
              className="w-full px-4 py-2.5 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A] font-mono font-bold text-sm"
            />
            <p className="text-[10px] text-[#64748B] mt-1">
              Simulating check-out for {selectedEmployee?.first_name || 'Employee'} (Normal schedule end: 04:00 PM)
            </p>
          </div>

          {/* Simulation Output Cards */}
          {simResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-apple-sm bg-[#F1F6FB] dark:bg-[#121A2A] space-y-3">
                <div className="flex justify-between items-center border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2">
                  <span className="text-[#64748B]">Regular Working Hours:</span>
                  <span className="font-mono font-bold text-status-green text-sm">8h 00m</span>
                </div>

                <div className="flex justify-between items-center border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2">
                  <span className="text-[#64748B]">Calculated Overtime:</span>
                  <span className="font-mono font-bold text-status-amber text-sm">
                    {Math.floor(simResult.roundedOvertimeMinutes / 60)}h {(simResult.roundedOvertimeMinutes % 60)}m ({simResult.overtimeHours} hrs)
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-[#111827] dark:text-[#F8FAFC]">Estimated Overtime Pay:</span>
                  <span className="font-mono font-extrabold text-brand-500 text-base">
                    {Number(simResult.overtimePay).toLocaleString()} IQD
                  </span>
                </div>
              </div>

              {simResult.note && (
                <div className="p-3 rounded-apple-sm water-badge text-brand-500 flex items-center space-x-2 text-[11px]">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{simResult.note}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
