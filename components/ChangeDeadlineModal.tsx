import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { Project } from '../types';
import { Calendar, AlertTriangle, X } from 'lucide-react';

interface ChangeDeadlineModalProps {
    project: Project;
    onClose: () => void;
}

export const ChangeDeadlineModal: React.FC<ChangeDeadlineModalProps> = ({ project, onClose }) => {
    const queryClient = useQueryClient();
    const [newDeadline, setNewDeadline] = useState('');
    const [justification, setJustification] = useState('');
    const [confirmed, setConfirmed] = useState(false);
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

    const isValid = () => {
        if (!newDeadline) return false;
        if (justification.trim().length < 15) return false;
        if (!confirmed) return false;
        // Parse as local date at noon to avoid UTC midnight timezone issues
        const [year, month, day] = newDeadline.split('-').map(Number);
        const deadlineDate = new Date(year, month - 1, day, 12, 0, 0);
        if (deadlineDate <= new Date()) return false;
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid()) return;

        setIsSubmitting(true);
        setError('');

        try {
            // VERSION INJECTION: Extract version at mutation time
            const currentProject = queryClient.getQueryData<Project>(['project', project.id]);
            const version = currentProject?.version;

            if (version === undefined || version === null) {
                throw new Error('Project version not available');
            }

            await backendApi.changeDeadline(project.id, {
                newDeadline: new Date(newDeadline).toISOString(), // Convert date string to full ISO datetime
                justification: justification.trim(),
                confirm: true,
                version // VERSION HARD GUARD enforced
            });

            // NO OPTIMISTIC UPDATE - Query invalidation only
            await queryClient.invalidateQueries({ queryKey: ['projects'] });
            await queryClient.invalidateQueries({ queryKey: ['project', project.id] });

            onClose();
        } catch (err: any) {
            // 409 conflicts automatically handled by axios interceptor
            setError(err.message || 'Failed to change deadline');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[16px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar size={18} className="text-indigo-500" />
                        Change Project Deadline
                    </h3>
                    <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                            <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">Admin Only</p>
                            <p className="text-[12px] text-amber-700 dark:text-amber-300 mt-1">
                                Changing the deadline requires justification and confirmation.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Current Deadline
                        </label>
                        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] text-slate-700 dark:text-slate-300">
                            {new Date(project.overallDeadline).toLocaleDateString()}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            New Deadline *
                        </label>
                        <input
                            type="date"
                            value={newDeadline}
                            onChange={(e) => setNewDeadline(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Justification * (min 15 characters)
                        </label>
                        <textarea
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100 resize-none"
                            required
                            minLength={15}
                            placeholder="Explain why the deadline needs to be changed..."
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                            {justification.length}/15 characters minimum
                        </p>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <input
                            type="checkbox"
                            id="confirm-deadline"
                            checked={confirmed}
                            onChange={(e) => setConfirmed(e.target.checked)}
                            className="w-4 h-4 rounded border-2 border-slate-400 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="confirm-deadline" className="text-[12px] font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                            I confirm this deadline change is necessary and justified
                        </label>
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
                            disabled={!isValid() || isSubmitting}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold text-[12px] rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Changing...' : 'Change Deadline'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
