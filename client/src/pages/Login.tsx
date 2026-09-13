import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, User, Users } from 'lucide-react';

export default function Login() {
  const { login, isLoading, error } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('admin@company.com');
  const [password, setPassword] = useState('admin123');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!emailOrUsername || !password) {
      setLocalError('Please enter both Email/Username and Password.');
      return;
    }

    try {
      await login(emailOrUsername, password);
    } catch (err: any) {
      // Error handled by AuthContext
    }
  };

  const handleDemoSelect = (demoEmail: string, demoPass: string) => {
    setEmailOrUsername(demoEmail);
    setPassword(demoPass);
    setLocalError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-[#F6F9FC] dark:bg-[#070B14] text-[#111827] dark:text-[#F8FAFC]">
      <div className="w-full max-w-md">
        {/* Brand Logo Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center shadow-water mx-auto mb-4">
            <Briefcase className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">WorkforceOS</h1>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
            Enterprise Workforce & Payroll Management Portal
          </p>
        </div>

        {/* Card Form Container */}
        <div className="bg-white dark:bg-[#0D1321] p-8 rounded-apple border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle">
          <h2 className="text-lg font-semibold mb-6">Sign In to Your Account</h2>

          {(error || localError) && (
            <div className="mb-6 p-4 rounded-apple-sm water-badge-red text-status-red flex items-start space-x-3 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{localError || error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] mb-2 uppercase tracking-wider">
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B] dark:text-[#94A3B8]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B] dark:text-[#94A3B8]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A] text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-apple-sm bg-brand-500 text-white font-medium text-sm hover:opacity-90 transition-all flex items-center justify-center space-x-2 shadow-water disabled:opacity-50"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-[#E2E8F0] dark:border-[#1E293B]">
            <p className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-3 text-center">
              Quick Demo Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSelect('admin@company.com', 'admin123')}
                className="px-2 py-2 rounded-apple-sm bg-[#F1F6FB] dark:bg-[#121A2A] hover:border-brand-500 border border-transparent text-[11px] font-medium flex flex-col items-center text-[#64748B] dark:text-[#94A3B8] hover:text-brand-500 transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5 mb-1" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('manager@company.com', 'password123')}
                className="px-2 py-2 rounded-apple-sm bg-[#F1F6FB] dark:bg-[#121A2A] hover:border-brand-500 border border-transparent text-[11px] font-medium flex flex-col items-center text-[#64748B] dark:text-[#94A3B8] hover:text-brand-500 transition-all"
              >
                <Users className="w-3.5 h-3.5 mb-1" />
                <span>Manager</span>
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('sara@company.com', 'password123')}
                className="px-2 py-2 rounded-apple-sm bg-[#F1F6FB] dark:bg-[#121A2A] hover:border-brand-500 border border-transparent text-[11px] font-medium flex flex-col items-center text-[#64748B] dark:text-[#94A3B8] hover:text-brand-500 transition-all"
              >
                <User className="w-3.5 h-3.5 mb-1" />
                <span>Employee</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
