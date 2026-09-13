import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, User, Briefcase, Mail, Phone, Calendar, DollarSign, Clock, Timer, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface EmployeeProfileProps {
  employeeId: number;
  onBack: () => void;
}

export default function EmployeeProfile({ employeeId, onBack }: EmployeeProfileProps) {
  const { token } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'overtime' | 'leave' | 'payroll'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [employeeId]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setEmployee(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-[#64748B]">Loading employee profile...</div>;
  }

  if (!employee) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-[#64748B]">Employee profile not found.</p>
        <button onClick={onBack} className="px-4 py-2 rounded-apple-sm bg-brand-500 text-white text-xs">
          Back to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onBack}
          className="p-2 rounded-apple-sm bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] text-[#64748B] hover:text-[#111827]"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Employee Profile</h2>
          <p className="text-xs text-[#64748B]">Code: {employee.employee_code}</p>
        </div>
      </div>

      {/* Header Profile Card */}
      <div className="p-6 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 text-white flex items-center justify-center text-xl font-bold shadow-water">
            {employee.first_name[0]}{employee.last_name[0]}
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h3 className="text-xl font-bold tracking-tight">{employee.first_name} {employee.last_name}</h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                employee.status === 'ACTIVE' ? 'water-badge-green text-status-green' : 'water-badge-red text-status-red'
              }`}>
                ● {employee.status}
              </span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
              {employee.job_title || 'Team Member'} — <span className="font-semibold text-brand-500">{employee.department_name || 'General'}</span>
            </p>
          </div>
        </div>

        {/* Right Info Highlights */}
        <div className="flex items-center gap-4 text-xs">
          <div className="px-4 py-2.5 rounded-apple-sm bg-[#F1F6FB] dark:bg-[#121A2A] text-center min-w-[120px]">
            <p className="text-[10px] text-[#64748B] uppercase font-semibold">Basic Salary</p>
            <p className="font-bold text-sm text-brand-500 mt-0.5">{Number(employee.basic_salary).toLocaleString()} IQD</p>
          </div>
          <div className="px-4 py-2.5 rounded-apple-sm bg-[#F1F6FB] dark:bg-[#121A2A] text-center min-w-[120px]">
            <p className="text-[10px] text-[#64748B] uppercase font-semibold">Overtime Rate</p>
            <p className="font-bold text-sm text-status-amber mt-0.5">{Number(employee.hourly_rate).toLocaleString()} IQD/hr</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0] dark:border-[#1E293B] flex space-x-6 text-xs font-semibold">
        {(['overview', 'attendance', 'overtime', 'leave', 'payroll'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 capitalize transition-all border-b-2 ${
              activeTab === tab
                ? 'border-brand-500 text-brand-500 dark:text-brand-dark font-bold'
                : 'border-transparent text-[#64748B] hover:text-[#111827]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="p-6 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle space-y-4">
            <h4 className="font-semibold text-sm border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2">Personal Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[#64748B]">Full Name</p>
                <p className="font-semibold text-[#111827] dark:text-[#F8FAFC]">{employee.first_name} {employee.last_name}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Email Address</p>
                <p className="font-semibold text-[#111827] dark:text-[#F8FAFC]">{employee.email}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Username</p>
                <p className="font-semibold text-[#111827] dark:text-[#F8FAFC]">{employee.username}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Phone Number</p>
                <p className="font-semibold text-[#111827] dark:text-[#F8FAFC]">{employee.phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle space-y-4">
            <h4 className="font-semibold text-sm border-b border-[#E2E8F0] dark:border-[#1E293B] pb-2">Employment Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[#64748B]">Department</p>
                <p className="font-semibold text-[#111827] dark:text-[#F8FAFC]">{employee.department_name || 'Unassigned'}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Assigned Manager</p>
                <p className="font-semibold text-[#111827] dark:text-[#F8FAFC]">{employee.manager_name || 'Self Lead'}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Work Schedule</p>
                <p className="font-semibold text-[#111827] dark:text-[#F8FAFC]">{employee.schedule_name} ({employee.start_time} — {employee.end_time})</p>
              </div>
              <div>
                <p className="text-[#64748B]">Hire Date</p>
                <p className="font-semibold text-[#111827] dark:text-[#F8FAFC]">{employee.hire_date || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'overview' && (
        <div className="p-8 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle text-center text-xs text-[#64748B]">
          Viewing {activeTab} history for {employee.first_name} {employee.last_name}. Integrated with core calculation engines.
        </div>
      )}
    </div>
  );
}
