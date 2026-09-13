import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Play, Coffee, Square, Clock, CheckCircle2, AlertCircle, Calendar, ShieldCheck, Timer } from 'lucide-react';

export default function Attendance() {
  const { token, user } = useAuth();
  const [todayData, setTodayData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [workingSeconds, setWorkingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchTodayData();
    fetchHistory();
  }, []);

  // Live Timer based on server check-in
  useEffect(() => {
    let interval: any = null;
    if (todayData?.attendance?.status === 'WORKING' && todayData?.attendance?.check_in) {
      const checkInTime = new Date(todayData.attendance.check_in).getTime();
      interval = setInterval(() => {
        const now = new Date().getTime();
        const breakMins = todayData.attendance.total_break_minutes || 0;
        const totalSecs = Math.max(0, Math.floor((now - checkInTime) / 1000) - breakMins * 60);
        setWorkingSeconds(totalSecs);
      }, 1000);
    } else if (todayData?.attendance?.actual_working_minutes) {
      setWorkingSeconds(todayData.attendance.actual_working_minutes * 60);
    } else {
      setWorkingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [todayData]);

  const fetchTodayData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/attendance/today', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTodayData(await res.json());
    } catch (err) {
      console.error('Failed to fetch today attendance', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/attendance/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setHistory(await res.json());
    } catch (err) {
      console.error('Failed to fetch attendance history', err);
    }
  };

  const handlePunchAction = async (endpoint: string) => {
    setError(null);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/attendance/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      await fetchTodayData();
      await fetchHistory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const formatClock = (isoStr?: string) => {
    if (!isoStr) return '--:--';
    return new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const status = todayData?.status || 'NOT_STARTED';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">Daily Attendance Portal</h2>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
          Server-authoritative time tracking, break management, and attendance history.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-apple-sm water-badge-red text-status-red flex items-center space-x-3 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Punch Hero Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Today's Attendance Status</span>
              <div className="flex items-center space-x-3 mt-1">
                <h3 className="text-2xl font-extrabold tracking-tight">
                  {status === 'NOT_STARTED' && 'Not Started'}
                  {status === 'WORKING' && '● Working'}
                  {status === 'ON_BREAK' && '● On Break'}
                  {status === 'PRESENT' && '✓ Completed (Present)'}
                  {status === 'LATE' && '● Completed (Late)'}
                </h3>
              </div>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-semibold text-[#64748B] uppercase">Active Working Time</p>
              <p className="text-2xl font-bold font-mono text-brand-500 mt-0.5">{formatTime(workingSeconds)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] flex flex-wrap gap-4">
            {status === 'NOT_STARTED' && (
              <button
                onClick={() => handlePunchAction('start-work')}
                disabled={actionLoading}
                className="flex-1 py-3 px-6 rounded-apple-sm bg-status-green text-white font-semibold text-sm hover:opacity-90 shadow-subtle transition-all flex items-center justify-center space-x-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START WORK</span>
              </button>
            )}

            {status === 'WORKING' && (
              <>
                <button
                  onClick={() => handlePunchAction('start-break')}
                  disabled={actionLoading}
                  className="flex-1 py-3 px-6 rounded-apple-sm bg-status-blue text-white font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center space-x-2"
                >
                  <Coffee className="w-4 h-4" />
                  <span>START BREAK</span>
                </button>
                <button
                  onClick={() => handlePunchAction('end-work')}
                  disabled={actionLoading}
                  className="flex-1 py-3 px-6 rounded-apple-sm bg-status-red text-white font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center space-x-2"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>END WORK</span>
                </button>
              </>
            )}

            {status === 'ON_BREAK' && (
              <button
                onClick={() => handlePunchAction('end-break')}
                disabled={actionLoading}
                className="flex-1 py-3 px-6 rounded-apple-sm bg-status-amber text-white font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center space-x-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>END BREAK</span>
              </button>
            )}

            {(status === 'PRESENT' || status === 'LATE' || status === 'COMPLETED') && (
              <div className="w-full py-3 px-6 rounded-apple-sm water-badge-green text-status-green font-semibold text-sm flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Workday Completed for Today</span>
              </div>
            )}
          </div>
        </div>

        {/* Visual Workday Timeline */}
        <div className="p-6 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle space-y-4">
          <h4 className="font-semibold text-sm border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2">Workday Event Timeline</h4>
          
          <div className="space-y-4 text-xs">
            {todayData?.attendance?.check_in ? (
              <div className="flex items-start space-x-3">
                <div className="w-2.5 h-2.5 rounded-full bg-status-green mt-1"></div>
                <div>
                  <p className="font-semibold">{formatClock(todayData.attendance.check_in)}</p>
                  <p className="text-[#64748B]">Started Work</p>
                  {todayData.attendance.late_arrival_minutes > 0 && (
                    <span className="text-[10px] text-status-amber font-semibold">
                      Late by {todayData.attendance.late_arrival_minutes} mins
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[#64748B] italic">No check-in recorded yet.</p>
            )}

            {todayData?.breaks?.map((b: any, index: number) => (
              <React.Fragment key={b.id}>
                <div className="flex items-start space-x-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-status-blue mt-1"></div>
                  <div>
                    <p className="font-semibold">{formatClock(b.break_start)}</p>
                    <p className="text-[#64748B]">Started Break #{index + 1}</p>
                  </div>
                </div>

                {b.break_end && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-status-amber mt-1"></div>
                    <div>
                      <p className="font-semibold">{formatClock(b.break_end)}</p>
                      <p className="text-[#64748B]">Ended Break #{index + 1} ({b.duration_minutes}m)</p>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}

            {todayData?.attendance?.check_out && (
              <div className="flex items-start space-x-3">
                <div className="w-2.5 h-2.5 rounded-full bg-status-red mt-1"></div>
                <div>
                  <p className="font-semibold">{formatClock(todayData.attendance.check_out)}</p>
                  <p className="text-[#64748B]">Finished Workday</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between">
          <h4 className="font-semibold text-sm">Attendance History Records</h4>
          <span className="text-xs text-[#64748B]">{history.length} Entries</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#F1F6FB] dark:bg-[#121A2A] text-[#64748B] dark:text-[#94A3B8] font-semibold border-b border-[#E2E8F0] dark:border-[#1E293B]">
            <tr>
              <th className="px-6 py-3.5">Date</th>
              <th className="px-6 py-3.5">Employee</th>
              <th className="px-6 py-3.5">Check-In</th>
              <th className="px-6 py-3.5">Check-Out</th>
              <th className="px-6 py-3.5">Break</th>
              <th className="px-6 py-3.5">Working Time</th>
              <th className="px-6 py-3.5">Overtime</th>
              <th className="px-6 py-3.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
            {history.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-[#64748B]">No attendance history found.</td>
              </tr>
            ) : (
              history.map((item) => (
                <tr key={item.id} className="hover:bg-[#F1F6FB]/50 dark:hover:bg-[#121A2A]/50">
                  <td className="px-6 py-4 font-mono font-semibold">{item.date}</td>
                  <td className="px-6 py-4 font-medium">{item.first_name} {item.last_name}</td>
                  <td className="px-6 py-4 font-mono">{formatClock(item.check_in)}</td>
                  <td className="px-6 py-4 font-mono">{formatClock(item.check_out)}</td>
                  <td className="px-6 py-4 font-mono text-[#64748B]">{item.total_break_minutes || 0}m</td>
                  <td className="px-6 py-4 font-mono font-semibold text-brand-500">
                    {Math.floor((item.actual_working_minutes || 0) / 60)}h {(item.actual_working_minutes || 0) % 60}m
                  </td>
                  <td className="px-6 py-4 font-mono text-status-amber font-semibold">
                    {Math.floor((item.overtime_minutes || 0) / 60)}h {(item.overtime_minutes || 0) % 60}m
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                      item.status === 'PRESENT' || item.status === 'WORKING'
                        ? 'water-badge-green text-status-green'
                        : item.status === 'LATE'
                        ? 'water-badge-amber text-status-amber'
                        : 'water-badge-red text-status-red'
                    }`}>
                      ● {item.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
