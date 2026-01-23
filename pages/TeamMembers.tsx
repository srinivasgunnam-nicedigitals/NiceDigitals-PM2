
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store';
import { UserRole, User, ProjectStage } from '../types';
import { Plus, Mail, Shield, Trash2, X, Lock, User as UserIcon, BarChart3, Briefcase, AlertCircle, Edit2 } from 'lucide-react';
import { Button, Badge, Input } from '../components/ui';

const AddUserModal = ({ onClose }: { onClose: () => void }) => {
  const { addUser } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.DESIGNER
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addUser({
      // id: We let the backend generate the ID now
      ...formData,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`
    } as any);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-saas-fade">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Invite Team Member</h2>
            <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest opacity-90">Set permissions & credentials</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                type="text"
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 dark:text-slate-100"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                type="email"
                placeholder="jane@agency.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 dark:text-slate-100"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Set Initial Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                type="password"
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 dark:text-slate-100"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Assign Role</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-black text-slate-900 dark:text-slate-100 appearance-none uppercase tracking-widest text-[10px]"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
              >
                <option value={UserRole.DESIGNER}>Designer</option>
                <option value={UserRole.DEV_MANAGER}>Dev Manager</option>
                <option value={UserRole.QA_ENGINEER}>QA Engineer</option>
                <option value={UserRole.ADMIN}>Administrator</option>
              </select>
            </div>
          </div>
          <Button type="submit" variant="primary" size="lg" fullWidth className="mt-4">
            Invite & Create Account
          </Button>
        </form>
      </div>
    </div>,
    document.body
  );
};

const EditUserModal = ({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (userId: string, updates: Partial<User>) => void }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    role: user.role
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(user.id, formData);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-saas-fade">
      <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-8 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Edit User</h2>
            <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest opacity-90">Update user details</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                type="text"
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 dark:text-slate-100"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                required
                type="email"
                placeholder="jane@agency.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 dark:text-slate-100"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-1.5">Assign Role</label>
            <div className="relative">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-black text-slate-900 dark:text-slate-100 appearance-none uppercase tracking-widest text-[10px]"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
              >
                <option value={UserRole.DESIGNER}>Designer</option>
                <option value={UserRole.DEV_MANAGER}>Dev Manager</option>
                <option value={UserRole.QA_ENGINEER}>QA Engineer</option>
                <option value={UserRole.ADMIN}>Administrator</option>
              </select>
            </div>
          </div>
          <Button type="submit" variant="primary" size="lg" fullWidth className="mt-4">
            <Edit2 size={16} />
            Save Changes
          </Button>
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

  return (
    <div className="p-8 space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-[24px] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">Team Roster</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Resource planning and team management</p>
        </div>
        {currentUser?.role === UserRole.ADMIN && (
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-5 h-5" />
            Add Team Member
          </Button>
        )}
      </div>

      {/* Resource Utilization Table - At Top */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2 px-2">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Resource Capacity Tracking</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-indigo-50/50 dark:bg-slate-900/30">
              <tr>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Resource Name</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest">Specialization</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">Active Projects</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {users.map(user => {
                const count = getActiveAssignmentsCount(user.id);
                const capacity = 5; // Theoretical max capacity for color coding
                const percentage = Math.min((count / capacity) * 100, 100);

                return (
                  <tr key={`resource-${user.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <img src={user.avatar} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600" alt="" />
                        <span className="font-black text-slate-900 dark:text-slate-100 tracking-tight">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <Badge variant="info" size="md" className="w-32 justify-center">
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Briefcase className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                        <span className="text-lg font-black text-slate-900 dark:text-slate-100">{count}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-24 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="w-8 text-[10px] font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-500 text-right">{Math.round(percentage)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Profile Management Table - Below */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2 px-2">
          <UserIcon className="w-5 h-5 text-slate-400 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-200 uppercase tracking-widest">User Profile Management</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-700">
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">User Profile</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Authority Role</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Presence</th>
                <th className="px-8 py-5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <img src={user.avatar} className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm" alt="" />
                      <div>
                        <p className="font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors tracking-tight">{user.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                        <Shield className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <Badge variant="success" size="sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Verified
                    </Badge>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {currentUser?.role === UserRole.ADMIN && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setUserToEdit(user)}
                          className="p-2.5 text-slate-300 dark:text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all"
                          aria-label="Edit user"
                          title="Edit user"
                        >
                          <Edit2 className="w-4.5 h-4.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2.5 text-slate-300 dark:text-slate-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          aria-label="Delete user"
                          title="Delete user"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
      {userToEdit && <EditUserModal user={userToEdit} onClose={() => setUserToEdit(null)} onSave={handleSaveEdit} />}

      {/* Delete Confirmation Dialog */}
      {userToDelete && createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-saas-fade">
          <div
            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Confirm Deletion</h2>
                  <p className="text-red-100 text-xs font-bold uppercase tracking-widest opacity-90">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              <p className="text-slate-600 dark:text-slate-300 mb-6 font-medium text-center">
                Are you sure you want to delete <span className="font-black text-slate-900 dark:text-slate-100">{users.find(u => u.id === userToDelete)?.name}</span>?
                <br />
                <span className="text-sm text-slate-500 dark:text-slate-400">This will permanently remove their account from the system.</span>
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setUserToDelete(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  onClick={confirmDelete}
                  className="flex-1"
                >
                  Delete User
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Error Modal */}
      {errorMessage && createPortal(
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-saas-fade">
          <div
            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 bg-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">{errorMessage.title}</h2>
                  <p className="text-amber-100 text-xs font-bold uppercase tracking-widest opacity-90">Action blocked</p>
                </div>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8">
              <p className="text-slate-600 dark:text-slate-300 mb-6 font-medium text-center">
                {errorMessage.message}
              </p>

              {/* Action Button */}
              <Button
                variant="secondary"
                size="md"
                onClick={() => setErrorMessage(null)}
                fullWidth
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                Understood
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TeamMembers;
