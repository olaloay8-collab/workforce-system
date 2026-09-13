import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import EmployeeModal from '../components/EmployeeModal';
import { Search, Plus, Filter, UserCheck, Eye, Edit3, UserX, ShieldCheck } from 'lucide-react';

interface EmployeesProps {
  onSelectEmployee: (id: number) => void;
}

export default function Employees({ onSelectEmployee }: EmployeesProps) {
  const { token, user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<any>(null);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, [search, departmentId, status]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (departmentId) params.append('departmentId', departmentId);
      if (status) params.append('status', status);

      const res = await fetch(`/api/employees?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch employees', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDepartments(await res.json());
    } catch (err) {
      console.error('Failed to fetch departments', err);
    }
  };

  const handleToggleStatus = async (employeeId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/employees/${employeeId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchEmployees();
    } catch (err) {
      console.error('Status toggle failed', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Workforce Employee Directory</h2>
          <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
            Manage company employees, departments, schedules, and individual overtime rules.
          </p>
        </div>

        {user?.role === 'ADMIN' && (
          <button
            onClick={() => {
              setSelectedForEdit(null);
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-apple-sm bg-brand-500 text-white font-medium text-xs hover:opacity-90 shadow-water transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>
        )}
      </div>

      {/* Filter Controls Bar */}
      <div className="p-4 rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#64748B] dark:text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search by name, employee code, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
          />
        </div>

        {/* Department Filter */}
        <div className="w-full md:w-48">
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-36">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-apple-sm border border-[#E2E8F0] dark:border-[#1E293B] bg-[#F1F6FB] dark:bg-[#121A2A]"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-apple bg-white dark:bg-[#0D1321] border border-[#E2E8F0] dark:border-[#1E293B] shadow-subtle overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F1F6FB] dark:bg-[#121A2A] text-[#64748B] dark:text-[#94A3B8] font-semibold border-b border-[#E2E8F0] dark:border-[#1E293B]">
            <tr>
              <th className="px-6 py-3.5">Code</th>
              <th className="px-6 py-3.5">Employee</th>
              <th className="px-6 py-3.5">Department</th>
              <th className="px-6 py-3.5">Manager</th>
              <th className="px-6 py-3.5">Job Title</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-[#64748B]">Loading employee directory...</td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-[#64748B]">No employees found matching criteria.</td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-[#F1F6FB]/50 dark:hover:bg-[#121A2A]/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-semibold text-brand-500">{emp.employee_code}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold text-xs">
                        {emp.first_name[0]}{emp.last_name[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-[#111827] dark:text-[#F8FAFC]">{emp.first_name} {emp.last_name}</p>
                        <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[#64748B] dark:text-[#94A3B8] font-medium">{emp.department_name || 'Unassigned'}</td>
                  <td className="px-6 py-4 text-[#64748B] dark:text-[#94A3B8]">{emp.manager_name || 'Self / Lead'}</td>
                  <td className="px-6 py-4 text-[#64748B] dark:text-[#94A3B8]">{emp.job_title || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full font-medium text-[10px] ${
                      emp.status === 'ACTIVE' ? 'water-badge-green text-status-green' : 'water-badge-red text-status-red'
                    }`}>
                      ● {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => onSelectEmployee(emp.id)}
                      title="View Full Profile"
                      className="p-1.5 rounded-md hover:bg-[#F1F6FB] dark:hover:bg-[#121A2A] text-brand-500"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {user?.role === 'ADMIN' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedForEdit(emp);
                            setIsModalOpen(true);
                          }}
                          title="Edit Details"
                          className="p-1.5 rounded-md hover:bg-[#F1F6FB] dark:hover:bg-[#121A2A] text-[#64748B]"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(emp.id, emp.status)}
                          title="Toggle Status"
                          className="p-1.5 rounded-md hover:bg-[#F1F6FB] dark:hover:bg-[#121A2A] text-status-amber"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchEmployees}
        employeeToEdit={selectedForEdit}
      />
    </div>
  );
}
