
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store';
import { Priority, UserRole } from '../types';
import { X, Calendar, Target, Flag, User, Paintbrush, Code } from 'lucide-react';

interface AddProjectModalProps {
  onClose: () => void;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ onClose }) => {
  const { addProject, clients, users } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    scope: '',
    priority: Priority.MEDIUM,
    overallDeadline: '',
    assignedDesignerId: '',
    assignedDevManagerId: ''
  });

  const isFormValid = formData.name.trim() !== '' &&
    formData.clientName.trim() !== '' &&
    formData.overallDeadline !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    addProject({
      ...formData,
      // Sanitize optional assignments: convert empty strings to null/undefined
      // The backend expects optional nullable UUIDs
      assignedDesignerId: formData.assignedDesignerId || null,
      assignedDevManagerId: formData.assignedDevManagerId || null
    });
    onClose(); // Ensure modal closes
  };

  // ... (useEffect remains the same)

  const designers = users.filter(u => u.role === UserRole.DESIGNER);
  const devManagers = users.filter(u => u.role === UserRole.DEV_MANAGER);

  const modalContent = (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-saas-fade">
      <div
        className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Initiate New Project</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Set goals and assign initial leads.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-8 max-h-[calc(90vh-120px)] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Project Title <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    type="text"
                    placeholder="e.g., Brand Overhaul"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 dark:text-slate-100 placeholder:font-medium dark:placeholder:text-slate-400"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    required
                    list="client-list"
                    type="text"
                    placeholder="Select Client"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
                    value={formData.clientName}
                    onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                  />
                  <datalist id="client-list">
                    {clients.map(client => (
                      <option key={client} value={client} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 dark:text-slate-100 appearance-none"
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as Priority })}
                  >
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700 pt-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Assign Designer</label>
                <div className="relative">
                  <Paintbrush className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 dark:text-slate-100 appearance-none"
                    value={formData.assignedDesignerId}
                    onChange={e => setFormData({ ...formData, assignedDesignerId: e.target.value })}
                  >
                    <option value="">Skip for now</option>
                    {designers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Assign Dev Lead</label>
                <div className="relative">
                  <Code className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 dark:text-slate-100 appearance-none"
                    value={formData.assignedDevManagerId}
                    onChange={e => setFormData({ ...formData, assignedDevManagerId: e.target.value })}
                  >
                    <option value="">Skip for now</option>
                    {devManagers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                Project Deadline <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  required
                  type="date"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 dark:text-slate-100"
                  value={formData.overallDeadline}
                  onChange={e => setFormData({ ...formData, overallDeadline: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Detailed Brief</label>
              <textarea
                rows={2}
                placeholder="Primary objectives..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
                value={formData.scope}
                onChange={e => setFormData({ ...formData, scope: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={!isFormValid}
              className={`w-full py-4 font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${isFormValid
                  ? 'bg-indigo-600 text-white shadow-indigo-100 dark:shadow-none hover:shadow-indigo-300 dark:hover:shadow-indigo-500/30'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                }`}
            >
              Initiate Project
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
