import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, Plus, Users, Calendar, CheckCircle2, AlertCircle, Save, X } from 'lucide-react';

export default function Schedules() {
  const { token, user } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Assign modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    startTime: '08:00',
    endTime: '16:00',
    gracePeriodMinutes: 15,
    minRequiredHours: 8.0,
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSchedules();
    fetchEmployees();
  }, []);

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/schedules', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSchedules(await res.json());
    } catch (err) {
      console.error('Failed to fetch schedules', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setEmployees(await res.json());
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          startTime: `${formData.startTime}:00`,
          endTime: `${formData.endTime}:00`,
          gracePeriodMinutes: Number(formData.gracePeriodMinutes),
          minRequiredHours: Number(formData.minRequiredHours),
          workingDays: formData.workingDays,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create schedule');

      fetchSchedules();
      setIsModalOpen(false);
      setFormData({
        name: '',
        startTime: '08:00',
        endTime: '16:00',
        gracePeriodMinutes: 15,
        minRequiredHours: 8.0,
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAssignSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScheduleId || !selectedEmployeeId) return;

    try {
      const res = await fetch('/api/schedules/assign', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: Number(selectedEmployeeId),
          scheduleId: selectedScheduleId,
        }),
      });

      if (res.ok) {
        fetchSchedules();
        setAssignModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to assign schedule', err);
    }
  };

  const toggleDay = (day: string) => {
    if (formData.workingDays.includes(day)) {
      setFormData({ ...formData, workingDays: formData.workingDays.filter((d) => d !== day) });
    } else {
      setFormData({ ...formData, workingDays: [...formData.workingDays, day] });
    }
  };

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Work Schedules & Shifts</h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
            Configure shift templates, working hours, grace periods, and assign schedules to employees.
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-apple-sm bg-brand-500 text-white font-medium text-xs hover:opacity-90 shadow-water transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Shift Schedule</span>
          </button>
        )}
      </div>

      {/* Schedules Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 text-center py-8 text-xs text-[#64748B]">Loading work schedules...</div>
        ) : (
          schedules.map((sched) => (
            <div key={sched.id} className="p-6 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-apple-sm water-badge text-brand-500">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{sched.name}</h3>
                    <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">ID: SCH-00{sched.id}</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold water-badge-green text-status-green">
                  Active
                </span>
              </div>

              {/* Timing info */}
              <div className="p-3 rounded-apple-sm bg-[#F1F6FB] dark:bg-[#121A2A] text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B]">Standard Shift:</span>
                  <span className="font-mono font-bold text-brand-500">{sched.start_time} — {sched.end_time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B]">Grace Period:</span>
                  <span className="font-semibold text-status-amber">{sched.grace_period_minutes} minutes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#64748B]">Required Work:</span>
                  <span className="font-semibold">{sched.min_required_hours} hours/day</span>
                </div>
              </div>

              {/* Working Days */}
              <div>
                <p className="text-[10px] font-semibold text-[#64748B] uppercase mb-1.5">Working Days</p>
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {daysOfWeek.map((day) => {
                    const isWorking = Array.isArray(sched.working_days) && sched.working_days.includes(day);
                    return (
                      <span
                        key={day}
                        className={`px-2 py-1 rounded-md font-semibold ${
                          isWorking
                            ? 'bg-brand-500 text-white'
                            : 'bg-[#F1F6FB] dark:bg-[#121A2A] text-[#64748B] opacity-50'
                        }`}
                      >
                        {day}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Assigned Employees */}
              <div className="pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 text-[#64748B]">
                  <Users className="w-3.5 h-3.5" />
                  <span>{sched.assigned_employee_count} Employees</span>
                </div>

                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setSelectedScheduleId(sched.id);
                      setAssignModalOpen(true);
                    }}
                    className="text-brand-500 font-semibold text-xs hover:underline"
                  >
                    Assign Employee
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D1321] rounded-apple border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between">
              <h3 className="font-semibold text-sm">Create New Work Schedule Template</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-[#64748B]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-apple-sm water-badge-red text-status-red flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#64748B] mb-1">Schedule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Evening Shift"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">Grace Period (mins)</label>
                  <input
                    type="number"
                    value={formData.gracePeriodMinutes}
                    onChange={(e) => setFormData({ ...formData, gracePeriodMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">Min Required Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.minRequiredHours}
                    onChange={(e) => setFormData({ ...formData, minRequiredHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#64748B] mb-1">Working Days</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-2.5 py-1 rounded-apple-sm text-[11px] font-semibold transition-all ${
                        formData.workingDays.includes(day)
                          ? 'bg-brand-500 text-white'
                          : 'bg-[#F1F6FB] dark:bg-[#121A2A] text-[#64748B]'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-apple-sm bg-[#F1F6FB] text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-apple-sm bg-brand-500 text-white font-medium flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Schedule Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D1321] rounded-apple border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between">
              <h3 className="font-semibold text-sm">Assign Schedule to Employee</h3>
              <button onClick={() => setAssignModalOpen(false)} className="p-1 text-[#64748B]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignSchedule} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#64748B] mb-1">Select Employee</label>
                <select
                  required
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employee_code} — {emp.first_name} {emp.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 rounded-apple-sm bg-[#F1F6FB] text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-apple-sm bg-brand-500 text-white font-medium"
                >
                  Assign Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
