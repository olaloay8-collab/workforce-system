import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import EmployeeProfile from './pages/EmployeeProfile';
import Schedules from './pages/Schedules';
import Attendance from './pages/Attendance';
import Overtime from './pages/Overtime';
import Leave from './pages/Leave';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  Timer, 
  CalendarDays, 
  FileBarChart, 
  Wallet, 
  Bell, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Briefcase, 
  LogOut
} from 'lucide-react';

function DashboardContent() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  // Toggle Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const role = user?.role || 'EMPLOYEE';

  return (
    <div className="flex min-h-screen bg-[#F6F9FC] dark:bg-[#070B14] text-[#111827] dark:text-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0D1321] p-5 flex flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 rounded-apple bg-brand-500 flex items-center justify-center text-white shadow-water">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-base leading-tight tracking-tight">WorkforceOS</h1>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">Enterprise Portal</p>
            </div>
          </div>

          {/* Navigation Groups */}
          <div className="space-y-6">
            <div>
              <p className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-2">Overview</p>
              <button 
                onClick={() => { setActiveTab('dashboard'); setSelectedEmployeeId(null); }} 
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-apple-sm text-sm font-medium transition-all ${
                  activeTab === 'dashboard' && !selectedEmployeeId
                    ? 'bg-[#DBEAFE] dark:bg-[#172033] text-brand-500 dark:text-brand-dark' 
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F6FB] dark:hover:bg-[#121A2A]'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-2">Workforce</p>
              <div className="space-y-1">
                {(role === 'ADMIN' || role === 'MANAGER') && (
                  <button 
                    onClick={() => { setActiveTab('employees'); setSelectedEmployeeId(null); }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-apple-sm text-sm font-medium transition-all ${
                      activeTab === 'employees' 
                        ? 'bg-[#DBEAFE] dark:bg-[#172033] text-brand-500 dark:text-brand-dark' 
                        : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F6FB] dark:hover:bg-[#121A2A]'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>{role === 'MANAGER' ? 'My Team' : 'Employees'}</span>
                  </button>
                )}
                <button 
                  onClick={() => { setActiveTab('schedules'); setSelectedEmployeeId(null); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-apple-sm text-sm font-medium transition-all ${
                    activeTab === 'schedules' 
                      ? 'bg-[#DBEAFE] dark:bg-[#172033] text-brand-500 dark:text-brand-dark' 
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F6FB] dark:hover:bg-[#121A2A]'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Work Schedules</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('attendance'); setSelectedEmployeeId(null); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-apple-sm text-sm font-medium transition-all ${
                    activeTab === 'attendance' 
                      ? 'bg-[#DBEAFE] dark:bg-[#172033] text-brand-500 dark:text-brand-dark' 
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F6FB] dark:hover:bg-[#121A2A]'
                  }`}
                >
                  <Timer className="w-4 h-4" />
                  <span>Attendance</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('overtime'); setSelectedEmployeeId(null); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-apple-sm text-sm font-medium transition-all ${
                    activeTab === 'overtime' 
                      ? 'bg-[#DBEAFE] dark:bg-[#172033] text-brand-500 dark:text-brand-dark' 
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F6FB] dark:hover:bg-[#121A2A]'
                  }`}
                >
                  <Timer className="w-4 h-4" />
                  <span>Overtime Rules</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('leave'); setSelectedEmployeeId(null); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-apple-sm text-sm font-medium transition-all ${
                    activeTab === 'leave' 
                      ? 'bg-[#DBEAFE] dark:bg-[#172033] text-brand-500 dark:text-brand-dark' 
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F6FB] dark:hover:bg-[#121A2A]'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>Leave Requests</span>
                </button>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-2">Finance & System</p>
              <div className="space-y-1">
                {role === 'ADMIN' && (
                  <button 
                    onClick={() => { setActiveTab('payroll'); setSelectedEmployeeId(null); }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-apple-sm text-sm font-medium transition-all ${
                      activeTab === 'payroll' 
                        ? 'bg-[#DBEAFE] dark:bg-[#172033] text-brand-500 dark:text-brand-dark' 
                        : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F6FB] dark:hover:bg-[#121A2A]'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Payroll</span>
                  </button>
                )}
                <button 
                  onClick={() => { setActiveTab('reports'); setSelectedEmployeeId(null); }}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-apple-sm text-sm font-medium transition-all ${
                    activeTab === 'reports' 
                      ? 'bg-[#DBEAFE] dark:bg-[#172033] text-brand-500 dark:text-brand-dark' 
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F6FB] dark:hover:bg-[#121A2A]'
                  }`}
                >
                  <FileBarChart className="w-4 h-4" />
                  <span>Reports</span>
                </button>
                {role === 'ADMIN' && (
                  <button 
                    onClick={() => { setActiveTab('audit'); setSelectedEmployeeId(null); }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-apple-sm text-sm font-medium transition-all ${
                      activeTab === 'audit' 
                        ? 'bg-[#DBEAFE] dark:bg-[#172033] text-brand-500 dark:text-brand-dark' 
                        : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F6FB] dark:hover:bg-[#121A2A]'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Audit Logs</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* User Card & Logout */}
        <div className="pt-6 border-t border-[#E2E8F0] dark:border-[#1E293B] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">Theme</span>
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
              className="p-2 rounded-apple-sm bg-[#F1F6FB] dark:bg-[#121A2A] text-[#64748B] dark:text-[#94A3B8] hover:text-brand-500"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
          <div className="p-3 rounded-apple-sm bg-[#F1F6FB] dark:bg-[#121A2A] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-semibold">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold leading-none truncate">{user?.name || user?.username}</p>
                <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8] mt-1 uppercase font-mono">{role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-md hover:bg-status-red/10 text-[#64748B] hover:text-status-red transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Header Bar */}
        <header className="h-16 border-b border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0D1321] px-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold capitalize tracking-tight">
              {selectedEmployeeId ? 'Employee Profile' : `${activeTab} Overview`}
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full water-badge text-brand-500 font-medium">
              Authenticated: {user?.email}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button className="relative p-2 rounded-apple-sm bg-[#F1F6FB] dark:bg-[#121A2A] text-[#64748B] dark:text-[#94A3B8]">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-status-amber"></span>
            </button>
          </div>
        </header>

        {/* Body Container */}
        <div className="p-8 flex-1 overflow-y-auto">
          {selectedEmployeeId ? (
            <EmployeeProfile 
              employeeId={selectedEmployeeId} 
              onBack={() => setSelectedEmployeeId(null)} 
            />
          ) : activeTab === 'employees' ? (
            <Employees 
              onSelectEmployee={(id) => setSelectedEmployeeId(id)} 
            />
          ) : activeTab === 'schedules' ? (
            <Schedules />
          ) : activeTab === 'attendance' ? (
            <Attendance />
          ) : activeTab === 'overtime' ? (
            <Overtime />
          ) : activeTab === 'leave' ? (
            <Leave />
          ) : (
            <Dashboard />
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

function MainApp() {
  const { user } = useAuth();

  if (!user) {
    return <Login />;
  }

  return <DashboardContent />;
}
