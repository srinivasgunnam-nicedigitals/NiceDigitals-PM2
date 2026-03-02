import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { backendApi } from '../../services/api';
import { Calendar, Info, X, ShieldAlert } from 'lucide-react';

// Define the shape of backend error mapping
interface ApiError {
    response?: {
        data?: {
            code?: string;
            message?: string;
        };
    };
    message?: string;
}

interface DeadlineEditModalProps {
    projectId: string;
    stage: string;
    stageLabel: string;
    currentDeadline: string | null;
    overallDeadline: string;
    onClose: () => void;
}

export function DeadlineEditModal({ projectId, stage, stageLabel, currentDeadline, overallDeadline, onClose }: DeadlineEditModalProps) {
    const queryClient = useQueryClient();

    const [newDeadline, setNewDeadline] = useState<string>(
        currentDeadline ? new Date(currentDeadline).toISOString().split('T')[0] : ''
    );
    const [reason, setReason] = useState<string>('');
    const [responsibility, setResponsibility] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const isExceedingOverall = newDeadline && new Date(newDeadline) > new Date(overallDeadline);

    const mutation = useMutation({
        mutationFn: (payload: { newDeadline: string; reason: string; delayResponsibility: string }) =>
            backendApi.updateStageDeadline(projectId, stage, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project', projectId] });
            onClose();
        },
        onError: (error: ApiError) => {
            const code = error.response?.data?.code;
            const msg = error.response?.data?.message || 'Failed to update deadline.';
            
            // Map known backend codes to readable messages
            if (code === 'STAGE_DEADLINE_LOCKED') {
                setErrorMsg('This stage has already been exited and is locked.');
            } else if (code === 'DEADLINE_EXCEEDS_OVERALL') {
                setErrorMsg('Stage deadline cannot extend beyond project overall deadline.');
            } else if (code === 'REASON_TOO_SHORT') {
                setErrorMsg('Reason must be at least 15 characters long.');
            } else {
                setErrorMsg(msg);
            }
        }
    });

    const isSubmitDisabled = !newDeadline || reason.length < 15 || !responsibility || mutation.isPending;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (isSubmitDisabled) return;

        // Force time to end of day to be safe, or just construct ISO string
        const deadlineDate = new Date(newDeadline);
        
        mutation.mutate({
            newDeadline: deadlineDate.toISOString(),
            reason,
            delayResponsibility: responsibility
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden ring-1 ring-slate-200">
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2 text-indigo-600">
                        <Calendar className="w-5 h-5" />
                        <h3 className="font-bold text-slate-900 tracking-tight">Edit {stageLabel}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {errorMsg && (
                        <div className="p-3 bg-red-50 text-red-600 text-[13px] font-medium rounded-lg border border-red-100 flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                            {errorMsg}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">New Deadline <span className="text-red-500">*</span></label>
                            <input
                                type="date"
                                value={newDeadline}
                                onChange={(e) => setNewDeadline(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-900 font-medium"
                                required
                            />
                        </div>

                        {isExceedingOverall && (
                            <div className="p-3 bg-amber-50 text-amber-700 text-[12px] font-bold rounded-lg border border-amber-200 flex items-start gap-2">
                                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                This exceeds the overall project deadline. Modification is permitted but logged.
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Reason for Change <span className="text-red-500">*</span></label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Why is this deadline changing?"
                                rows={3}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-900 text-[14px] resize-none"
                                required
                            />
                            <div className="flex justify-between mt-1">
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${reason.length < 15 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                    {reason.length} / 15 chars min
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Delay Responsibility <span className="text-red-500">*</span></label>
                            <select
                                value={responsibility}
                                onChange={(e) => setResponsibility(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-900 font-medium"
                                required
                            >
                                <option value="" disabled>Select responsibility...</option>
                                <option value="INTERNAL">Internal (Team delay)</option>
                                <option value="CLIENT">Client (Approval / Asset delay)</option>
                                <option value="EXTERNAL">External (Third-party)</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6">
                        <p className="text-[11px] text-slate-500 font-medium mb-4 flex items-start gap-1.5 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <ShieldAlert className="w-[14px] h-[14px] text-slate-400 shrink-0 mt-0.5" />
                            This change will be permanently logged and cannot be erased. By proceeding, you confirm the delay responsibility is accurate.
                        </p>
                        
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-[13px] font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitDisabled}
                                className="px-5 py-2.5 text-[13px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl transition-all shadow-sm"
                            >
                                {mutation.isPending ? 'Logging...' : 'Confirm Deadline'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
