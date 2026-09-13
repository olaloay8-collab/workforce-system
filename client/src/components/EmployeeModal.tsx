import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeToEdit?: any;
}

export default function EmployeeModal({ isOpen, onClose, onSuccess, employeeToEdit }: EmployeeModalProps) {
  const { token } = useAuth();
  const [departments, setDepartments] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    roleId: '3', // Employee
    phone: '',
    departmentId: '',
    managerId: '',
    jobTitle: '',
    hireDate: new Date().toISOString().split('T')[0],
    basicSalary: '800000',
    hourlyRate: '5000',
  });

  useEffect(() => {
    if (isOpen) {
      fetchDropdowns();
      if (employeeToEdit) {
        setFormData({
          firstName: employeeToEdit.first_name || '',
          lastName: employeeToEdit.last_name || '',
          email: employeeToEdit.email || '',
          username: employeeToEdit.username || '',
          password: '', // Leave blank unless changing
          roleId: String(employeeToEdit.role_id || 3),
          phone: employeeToEdit.phone || '',
          departmentId: String(employeeToEdit.department_id || ''),
          managerId: String(employeeToEdit.manager_id || ''),
          jobTitle: employeeToEdit.job_title || '',
          hireDate: employeeToEdit.hire_date || new Date().toISOString().split('T')[0],
          basicSalary: String(employeeToEdit.basic_salary || '800000'),
          hourlyRate: String(employeeToEdit.hourly_rate || '5000'),
        });
      } else {
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          username: '',
          password: '',
          roleId: '3',
          phone: '',
          departmentId: '',
          managerId: '',
          jobTitle: '',
          hireDate: new Date().toISOString().split('T')[0],
          basicSalary: '800000',
          hourlyRate: '5000',
        });
      }
    }
  }, [isOpen, employeeToEdit]);

  const fetchDropdowns = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        fetch('/api/departments', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (empRes.ok) setManagers(await empRes.json());
    } catch (err) {
      console.error('Failed to load modal dropdowns', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const url = employeeToEdit ? `/api/employees/${employeeToEdit.id}` : '/api/employees';
      const method = employeeToEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          username: formData.username,
          password: formData.password || undefined,
          roleId: Number(formData.roleId),
          phone: formData.phone,
          departmentId: formData.departmentId ? Number(formData.departmentId) : null,
          managerId: formData.managerId ? Number(formData.managerId) : null,
          jobTitle: formData.jobTitle,
          hireDate: formData.hireDate,
          basicSalary: Number(formData.basicSalary),
          hourlyRate: Number(formData.hourlyRate),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0D1321] rounded-apple border border-[#E2E8F0] dark:border-[#1E293B] shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-brand-500" />
            <h3 className="font-semibold text-base">
              {employeeToEdit ? 'Edit Employee Profile' : 'Onboard New Employee'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-[#64748B] hover:text-[#111827] dark:hover:text-[#F8FAFC]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-3 rounded-apple-sm water-badge-red text-status-red flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1">Username *</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
              />
            </div>
          </div>

          {!employeeToEdit && (
            <div>
              <label className="block font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1">Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1">Department</label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1">Assigned Manager</label>
              <select
                value={formData.managerId}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
              >
                <option value="">Select Manager</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1">Job Title</label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                placeholder="Software Developer"
                className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+15550192"
                className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1">Basic Monthly Salary (IQD)</label>
              <input
                type="number"
                value={formData.basicSalary}
                onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1">Overtime Hourly Rate (IQD)</label>
              <input
                type="number"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                className="w-full px-3 py-2 rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
              />
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1E293B] flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-apple-sm bg-[#F1F6FB] dark:bg-[#121A2A] text-[#64748B] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-apple-sm bg-brand-500 text-white font-medium flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Employee'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
