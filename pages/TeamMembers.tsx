import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store';
import { UserRole, User, ProjectStage } from '../types';
import { Plus, Mail, Shield, Trash2, X, Lock, User as UserIcon, AlertCircle, Edit2, Search, Filter, ChevronDown } from 'lucide-react';

const RoleBadge = ({ role }: { role: UserRole | string }) => {
  const styles: Record<string, string> = {
    [UserRole.ADMIN]: 'bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 border-none',
    [UserRole.DESIGNER]: 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-500/10 dark:text-purple-400',
    [UserRole.DEV_MANAGER]: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400',
    [UserRole.QA_ENGINEER]: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400',
  };
  
  const className = styles[role] || 'bg-gray-50 text-gray-600 ring-gray-500/10';
  const label = role.replace('_', ' ');

  return (
    <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset w-[120px] ${className}`}>
      {label}
    </span>
  );
};

// Modals
const AddUserModal = ({ onClose }: { onClose: () => void }) => {
  const { addUser } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: UserRole.DESIGNER
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addUser({
      ...formData,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`
    } as any);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0">Invite Team Member</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                type="text"
                placeholder="e.g. Jane Doe"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-shadow"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
              <input
                required
                type="text"
                placeholder="janedoe"
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-shadow"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                type="email"
                placeholder="jane@company.com"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-shadow"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Initial Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                type="password"
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-shadow"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Assign Role</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 dark:text-slate-100 transition-shadow appearance-none"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
              >
                <option value={UserRole.DESIGNER}>Designer</option>
                <option value={UserRole.DEV_MANAGER}>Dev Manager</option>
                <option value={UserRole.QA_ENGINEER}>QA Engineer</option>
                <option value={UserRole.ADMIN}>Administrator</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
            >
              Invite Member
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

const EditUserModal = ({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (userId: string, updates: Partial<User>) => void }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    username: user.username || '',
    email: user.email,
    role: user.role
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(user.id, formData);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-0">Edit Team Member</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                type="text"
                placeholder="e.g. Jane Doe"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-shadow"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
              <input
                required
                type="text"
                placeholder="janedoe"
                className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-shadow"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                type="email"
                placeholder="jane@company.com"
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-shadow"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Assign Role</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 dark:text-slate-100 transition-shadow appearance-none"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
              >
                <option value={UserRole.DESIGNER}>Designer</option>
                <option value={UserRole.DEV_MANAGER}>Dev Manager</option>
                <option value={UserRole.QA_ENGINEER}>QA Engineer</option>
                <option value={UserRole.ADMIN}>Administrator</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

const TeamMembers = () => {
  const { users, projects, deleteUser, updateUser, currentUser } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<{ title: string; message: string } | null>(null);
  
  // Filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const getActiveAssignmentsCount = (userId: string) => {
    return projects.filter(p =>
      p.stage !== ProjectStage.COMPLETED &&
      (p.assignedDesignerId === userId || p.assignedDevManagerId === userId || p.assignedQAId === userId)
    ).length;
  };

  const handleDeleteUser = (userId: string) => {
    const assignmentCount = getActiveAssignmentsCount(userId);
    if (assignmentCount > 0) {
      const userName = users.find(u => u.id === userId)?.name || 'User';
      setErrorMessage({
        title: 'Cannot Delete User',
        message: `${userName} is assigned to ${assignmentCount} active project(s). Please reassign their projects first.`
      });
      return;
    }
    setUserToDelete(userId);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUser(userToDelete);
      setUserToDelete(null);
    }
  };

  const handleSaveEdit = (userId: string, updates: Partial<User>) => {
    updateUser(userId, updates);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6 font-sans text-slate-900 dark:text-slate-100 pb-20 animate-in fade-in duration-300 antialiased">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mt-0 mb-1">Team Members List</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Managing {users.length} active team members</p>
        </div>
        {currentUser?.role === UserRole.ADMIN && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
           <div className="relative w-full sm:w-48">
             <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <select
               value={roleFilter}
               onChange={(e) => setRoleFilter(e.target.value)}
               className="w-full pl-9 pr-8 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
             >
               <option value="ALL">All Roles</option>
               <option value={UserRole.ADMIN}>Administrator</option>
               <option value={UserRole.DESIGNER}>Designer</option>
               <option value={UserRole.DEV_MANAGER}>Dev Manager</option>
               <option value={UserRole.QA_ENGINEER}>QA Engineer</option>
             </select>
             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
           </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">MEMBER</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider text-center">ROLE</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">WORKLOAD CAPACITY</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.length === 0 ? (
                <tr>
                   <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                      No team members found matching your criteria.
                   </td>
                </tr>
              ) : filteredUsers.map(user => {
                const count = getActiveAssignmentsCount(user.id);
                const capacity = 5; 
                const percentage = Math.min((count / capacity) * 100, 100);

                let capacityColor = "bg-emerald-500";
                let capacityText = "text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400";
                let statusLabel = "Available";
                
                if (count >= capacity) {
                  capacityColor = "bg-red-500";
                  capacityText = "text-red-700 bg-red-50 dark:bg-red-500/10 dark:text-red-400";
                  statusLabel = "At Capacity";
                } else if (count >= capacity * 0.6) {
                  capacityColor = "bg-amber-500";
                  capacityText = "text-amber-700 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400";
                  statusLabel = "Busy";
                }
                
                return (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`} 
                             className="w-10 h-10 rounded-full ring-1 ring-slate-200 dark:ring-slate-700" alt="" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-0">{user.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {user.username && <span className="text-[11px] text-slate-500">@{user.username}</span>}
                            {user.username && <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>}
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-center">
                        <RoleBadge role={user.role} />
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {user.role === UserRole.ADMIN ? (
                        <span className="text-xs text-slate-400 italic">Not Applicable</span>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="flex-1 w-full max-w-[140px]">
                            <div className="flex justify-between items-end mb-1.5">
                               <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{count} Active Projects</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full ${capacityColor} transition-all duration-500 rounded-full`} style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${capacityText}`}>
                              {statusLabel}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {currentUser?.role === UserRole.ADMIN ? (
                        <div className="flex items-center justify-end gap-1 transition-opacity">
                          <button
                            onClick={() => setUserToEdit(user)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                            title="Edit user"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                         <div className="text-xs text-slate-400 italic">View Only</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 text-xs text-slate-500 font-medium flex justify-center sm:justify-between items-center">
             <span>Showing {filteredUsers.length} of {users.length} members</span>
          </div>
        </div>
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
      {userToEdit && <EditUserModal user={userToEdit} onClose={() => setUserToEdit(null)} onSave={handleSaveEdit} />}

      {/* Delete Confirmation Dialog */}
      {userToDelete && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 mt-0">Delete Team Member</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-slate-200">{users.find(u => u.id === userToDelete)?.name}</span>? This action is permanent and cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-2 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-2 px-4 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                >
                  Delete Member
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Error Modal */}
      {errorMessage && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 mt-0">{errorMessage.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                {errorMessage.message}
              </p>
              <button
                onClick={() => setErrorMessage(null)}
                className="w-full py-2 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TeamMembers;
