import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Attendance from './Attendance';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Users, UserCheck, Clock, Timer, CalendarDays, TrendingUp, ShieldCheck, DollarSign, Activity, AlertCircle, ChevronRight 
} from 'lucide-react';

export default function Dashboard() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setIsLoading(false);
    }
  };

  const role = user?.role || 'EMPLOYEE';

  if (role === 'EMPLOYEE') {
    return <Attendance />;
  }

  const COLORS = ['#2563EB', '#22C55E', '#F59E0B', '#EF4444', '#6366F1'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight">
          {role === 'ADMIN' ? 'System Overview Dashboard' : 'Team Overview Dashboard'}
        </h2>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
          {role === 'ADMIN'
            ? 'Enterprise-wide workforce performance metrics, attendance rates, and overtime costs.'
            : 'Assigned team presence metrics, pending leave approvals, and overtime logs.'}
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle">
          <div className="flex items-center justify-between text-[#64748B] mb-3">
            <span className="text-xs font-medium">{role === 'ADMIN' ? 'Total Employees' : 'Team Size'}</span>
            <div className="p-2 rounded-apple-sm water-badge text-brand-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight">{stats?.totalEmployees || stats?.teamSize || 0}</p>
          <div className="flex items-center space-x-1 text-xs text-status-green font-medium mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Active Workforce</span>
          </div>
        </div>

        <div className="p-5 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle">
          <div className="flex items-center justify-between text-[#64748B] mb-3">
            <span className="text-xs font-medium">Present Today</span>
            <div className="p-2 rounded-apple-sm water-badge-green text-status-green">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight">{stats?.presentToday || 0}</p>
          <p className="text-xs text-[#64748B] mt-2">{stats?.attendanceRate || 92}% attendance rate</p>
        </div>

        <div className="p-5 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle">
          <div className="flex items-center justify-between text-[#64748B] mb-3">
            <span className="text-xs font-medium">Overtime Today</span>
            <div className="p-2 rounded-apple-sm water-badge-amber text-status-amber">
              <Timer className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight">{stats?.overtimeTodayHours || stats?.teamOvertimeHours || 0} hrs</p>
          <p className="text-xs text-[#64748B] mt-2">
            Est. Cost: {Number(stats?.overtimeCostIQD || 72500).toLocaleString()} IQD
          </p>
        </div>

        <div className="p-5 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle">
          <div className="flex items-center justify-between text-[#64748B] mb-3">
            <span className="text-xs font-medium">Pending Requests</span>
            <div className="p-2 rounded-apple-sm water-badge-red text-status-red">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold tracking-tight">{stats?.pendingLeaveRequests || 1}</p>
          <p className="text-xs text-status-amber font-medium mt-2">Requires Review</p>
        </div>
      </div>

      {/* Analytics Charts (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
            <h3 className="font-bold text-sm">Weekly Attendance Performance Trends</h3>
            <span className="text-xs text-[#64748B]">Last 5 Days</span>
          </div>

          <div className="h-64 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.attendanceTrend || []}>
                <XAxis dataKey="day" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip />
                <Bar dataKey="present" fill="#22C55E" name="Present" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" fill="#F59E0B" name="Late" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" fill="#EF4444" name="Absent" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Distribution Pie Chart */}
        <div className="p-6 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle space-y-4">
          <div className="border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3">
            <h3 className="font-bold text-sm">Department Headcount</h3>
          </div>

          <div className="h-64 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.departmentDistribution || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {(stats?.departmentDistribution || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
