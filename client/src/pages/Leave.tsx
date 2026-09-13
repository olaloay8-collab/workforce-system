import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, Plus, CheckCircle2, XCircle, Clock, AlertCircle, Send, X, MessageSquare } from 'lucide-react';

export default function Leave() {
  const { token, user } = useAuth();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [decisionType, setDecisionType] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [managerComments, setManagerComments] = useState('');

  // Submit Form State
  const [formData, setFormData] = useState({
    leaveType: 'ANNUAL',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaves();
  }, [activeTab]);

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const url = activeTab === 'ALL' ? '/api/leaves' : `/api/leaves?status=${activeTab}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setLeaves(await res.json());
    } catch (err) {
      console.error('Failed to fetch leave requests', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit leave request');

      fetchLeaves();
      setIsSubmitModalOpen(false);
      setFormData({
        leaveType: 'ANNUAL',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeave) return;

    try {
      const res = await fetch(`/api/leaves/${selectedLeave.id}/decision`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: decisionType,
          managerComments,
        }),
      });

      if (res.ok) {
        fetchLeaves();
        setIsDecisionModalOpen(false);
        setManagerComments('');
      }
    } catch (err) {
      console.error('Failed to update leave decision', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Leave Management Center</h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
            Submit leave requests, review pending approvals, and manage automated attendance syncing.
          </p>
        </div>

        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-apple-sm bg-brand-500 text-white font-medium text-xs hover:opacity-90 shadow-water transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Request Leave</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0] dark:border-[#1E293B] flex space-x-6 text-xs font-semibold">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((tab) => (
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

      {/* Leave Request Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 text-center py-8 text-xs text-[#64748B]">Loading leave requests...</div>
        ) : leaves.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-xs text-[#64748B]">No leave requests found.</div>
        ) : (
          leaves.map((leave) => (
            <div
              key={leave.id}
              className="p-5 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle space-y-4 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-[10px]">
                    {leave.first_name[0]}{leave.last_name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold">{leave.first_name} {leave.last_name}</h4>
                    <p className="text-[10px] text-[#64748B]">{leave.department_name || 'General'}</p>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                  leave.status === 'APPROVED'
                    ? 'water-badge-green text-status-green'
                    : leave.status === 'PENDING'
                    ? 'water-badge-amber text-status-amber'
                    : 'water-badge-red text-status-red'
                }`}>
                  ● {leave.status}
                </span>
              </div>

              {/* Details box */}
              <div className="p-3 rounded-apple-sm bg-[#F1F6FB] dark:bg-[#121A2A] space-y-1.5">
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-brand-500">{leave.leave_type} LEAVE</span>
                  <span className="text-[#111827] dark:text-[#F8FAFC]">{leave.duration_days} Days</span>
                </div>
                <div className="text-[11px] text-[#64748B]">
                  <span>Dates: </span>
                  <span className="font-mono font-semibold text-[#111827] dark:text-[#F8FAFC]">
                    {leave.start_date} → {leave.end_date}
                  </span>
                </div>
                {leave.reason && (
                  <p className="text-[11px] text-[#64748B] italic pt-1 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                    "{leave.reason}"
                  </p>
                )}
              </div>

              {/* Manager comments if available */}
              {leave.manager_comments && (
                <div className="text-[10px] text-[#64748B] flex items-start space-x-1.5 pt-1">
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 text-brand-500 mt-0.5" />
                  <span>Note: {leave.manager_comments}</span>
                </div>
              )}

              {/* Decision Action Buttons (Manager / Admin) */}
              {leave.status === 'PENDING' && (user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1E293B] flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedLeave(leave);
                      setDecisionType('APPROVED');
                      setIsDecisionModalOpen(true);
                    }}
                    className="flex-1 py-1.5 rounded-apple-sm bg-status-green text-white font-semibold text-[11px] flex items-center justify-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedLeave(leave);
                      setDecisionType('REJECTED');
                      setIsDecisionModalOpen(true);
                    }}
                    className="flex-1 py-1.5 rounded-apple-sm bg-status-red text-white font-semibold text-[11px] flex items-center justify-center space-x-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Submit Leave Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D1321] rounded-apple border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between">
              <h3 className="font-semibold text-sm">Submit Leave Request</h3>
              <button onClick={() => setIsSubmitModalOpen(false)} className="p-1 text-[#64748B]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-apple-sm water-badge-red text-status-red flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#64748B] mb-1">Leave Type</label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                >
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                  <option value="MATERNITY">Maternity / Paternity</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#64748B] mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#64748B] mb-1">Reason / Notes</label>
                <textarea
                  rows={3}
                  placeholder="State the reason for your leave request..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-apple-sm bg-[#F1F6FB] text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-apple-sm bg-brand-500 text-white font-medium flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manager Decision Modal */}
      {isDecisionModalOpen && selectedLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D1321] rounded-apple border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {decisionType === 'APPROVED' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h3>
              <button onClick={() => setIsDecisionModalOpen(false)} className="p-1 text-[#64748B]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDecision} className="p-6 space-y-4 text-xs">
              <p className="text-[#64748B]">
                Confirm decision for <span className="font-bold text-[#111827] dark:text-[#F8FAFC]">{selectedLeave.first_name} {selectedLeave.last_name}</span> ({selectedLeave.duration_days} days).
              </p>

              <div>
                <label className="block font-semibold text-[#64748B] mb-1">Decision Comment / Reason</label>
                <textarea
                  rows={2}
                  placeholder="Optional manager comments..."
                  value={managerComments}
                  onChange={(e) => setManagerComments(e.target.value)}
                  className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsDecisionModalOpen(false)}
                  className="px-4 py-2 rounded-apple-sm bg-[#F1F6FB] text-[#64748B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-apple-sm font-medium text-white ${
                    decisionType === 'APPROVED' ? 'bg-status-green' : 'bg-status-red'
                  }`}
                >
                  Confirm {decisionType}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
