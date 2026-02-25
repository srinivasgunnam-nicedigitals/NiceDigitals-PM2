import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { Project, User } from '../types';
import { UserPlus, X } from 'lucide-react';

interface ReassignLeadModalProps {
    project: Project;
    users: User[];
    onClose: () => void;
}

export const ReassignLeadModal: React.FC<ReassignLeadModalProps> = ({ project, users, onClose }) => {
    const queryClient = useQueryClient();
    const [role, setRole] = useState<'DESIGN' | 'DEV' | 'QA'>('DESIGN');
    const [userId, setUserId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const getCurrentLead = () => {
        switch (role) {
            case 'DESIGN': return project.assignedDesignerId;
            case 'DEV': return project.assignedDevManagerId;
            case 'QA': return project.assignedQAId;
        }
    };

    const getEligibleUsers = () => {
        const roleMap = {
            'DESIGN': 'DESIGNER',
            'DEV': 'DEV_MANAGER',
            'QA': 'QA_ENGINEER'
        };
        return users.filter(u => u.role === roleMap[role]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        setIsSubmitting(true);
        setError('');

        try {
            // VERSION INJECTION: Extract version at mutation time
            const currentProject = queryClient.getQueryData<Project>(['project', project.id]);
            const version = currentProject?.version;

            if (version === undefined || version === null) {
                throw new Error('Project version not available');
            }

            await backendApi.reassignLead(project.id, {
                role,
                userId,
                version // VERSION HARD GUARD enforced
            });

            // NO OPTIMISTIC UPDATE - Query invalidation only
            await queryClient.invalidateQueries({ queryKey: ['projects'] });
            await queryClient.invalidateQueries({ queryKey: ['project', project.id] });

            onClose();
        } catch (err: any) {
            // 409 conflicts automatically handled by axios interceptor
            setError(err.message || 'Failed to reassign lead');
            setIsSubmitting(false);
        }
    };

    const currentLeadId = getCurrentLead();
    const currentLead = users.find(u => u.id === currentLeadId);
    const eligibleUsers = getEligibleUsers();

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[16px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <UserPlus size={18} className="text-indigo-500" />
                        Reassign Project Lead
                    </h3>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Role
                        </label>
                        <select
                            value={role}
                            onChange={(e) => {
                                setRole(e.target.value as any);
                                setUserId('');
                            }}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100"
                        >
                            <option value="DESIGN">Design Lead</option>
                            <option value="DEV">Dev Lead</option>
                            <option value="QA">QA Lead</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Current {role} Lead
                        </label>
                        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] text-slate-700 dark:text-slate-300">
                            {currentLead?.name || 'Unassigned'}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            New {role} Lead *
                        </label>
                        <select
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100"
                            required
                        >
                            <option value="">Select a user...</option>
                            {eligibleUsers.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.name} ({user.email})
                                </option>
                            ))}
                        </select>
                        {eligibleUsers.length === 0 && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2">
                                No eligible users found for this role
                            </p>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-[12px] text-red-700 dark:text-red-300">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[12px] rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!userId || isSubmitting}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold text-[12px] rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Reassigning...' : 'Reassign Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
