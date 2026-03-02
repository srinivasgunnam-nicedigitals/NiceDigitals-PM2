import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// =============================================
// REVERT REASON MODAL — Governance Enforcement Surface
// =============================================
// Centralized modal for ALL backward transitions.
// Forces structured revertReasonCategory + descriptive note.
// No transition proceeds without valid reason data.

export const REVERT_CATEGORIES = [
    { value: 'CLIENT_CHANGE_REQUEST', label: 'Client Change Request', severity: 'Low', desc: 'Client requested modifications after review' },
    { value: 'DESIGN_CLARIFICATION', label: 'Design Clarification', severity: 'Low', desc: 'Design decisions need revisiting' },
    { value: 'DEV_IMPLEMENTATION_BUG', label: 'Development Bug', severity: 'Medium', desc: 'Implementation error found during review' },
    { value: 'QA_MISS', label: 'QA Miss', severity: 'Medium', desc: 'Quality issue missed during testing' },
    { value: 'CONTENT_MISSING', label: 'Content Missing', severity: 'Medium', desc: 'Required content not provided or incomplete' },
    { value: 'PERFORMANCE_ISSUE', label: 'Performance Issue', severity: 'High', desc: 'Performance degradation detected' },
    { value: 'SCOPE_EXPANSION', label: 'Scope Expansion', severity: 'High', desc: 'Requirements expanded beyond original scope' },
    { value: 'OTHER', label: 'Other', severity: 'Medium', desc: 'Reason not covered by above categories' },
] as const;

const SEVERITY_COLORS: Record<string, string> = {
    'Low': 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30',
    'Medium': 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30',
    'High': 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30',
};

const MIN_NOTE_LENGTH = 15;

interface RevertReasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (category: string, note: string) => void;
    fromStage: string;
    toStage: string;
    isSubmitting?: boolean;
}

export const RevertReasonModal: React.FC<RevertReasonModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    fromStage,
    toStage,
    isSubmitting = false,
}) => {
    const [category, setCategory] = useState('');
    const [note, setNote] = useState('');

    if (!isOpen) return null;

    const selectedCat = REVERT_CATEGORIES.find(c => c.value === category);
    const isNoteValid = note.trim().length >= MIN_NOTE_LENGTH;
    const isFormValid = !!category && isNoteValid;

    const handleSubmit = () => {
        if (!isFormValid) return;
        onSubmit(category, note.trim());
    };

    const handleClose = () => {
        setCategory('');
        setNote('');
        onClose();
    };

    const formatStage = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm shadow-2xl" onClick={handleClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">Backward Transition</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {formatStage(fromStage)} → {formatStage(toStage)}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors">
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5">
                    {/* Category Dropdown */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                            Reason Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-[13px] text-slate-900 dark:text-white focus:ring-2 focus:ring-red-300 dark:focus:ring-red-700 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Select a reason...</option>
                            {REVERT_CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label} ({cat.severity} severity)
                                </option>
                            ))}
                        </select>

                        {/* Severity indicator */}
                        {selectedCat && (
                            <div className="mt-2 flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEVERITY_COLORS[selectedCat.severity]}`}>
                                    {selectedCat.severity} Severity
                                </span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                    {selectedCat.desc}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Note Textarea */}
                    <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                            Detailed Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Describe the specific reason for this backward transition..."
                            rows={4}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-[13px] text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-red-300 dark:focus:ring-red-700 focus:border-transparent outline-none transition-all resize-none"
                        />
                        <div className="flex justify-between mt-1.5">
                            <span className={`text-[10px] font-medium ${
                                note.trim().length === 0
                                    ? 'text-slate-400'
                                    : isNoteValid
                                        ? 'text-emerald-500'
                                        : 'text-red-500'
                            }`}>
                                {isNoteValid
                                    ? '✓ Meets minimum length'
                                    : `Minimum ${MIN_NOTE_LENGTH} characters required`
                                }
                            </span>
                            <span className={`text-[10px] font-mono ${
                                isNoteValid ? 'text-emerald-500' : 'text-slate-400'
                            }`}>
                                {note.trim().length}/{MIN_NOTE_LENGTH}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                    <button
                        onClick={handleClose}
                        className="flex-1 py-3 text-[13px] font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid || isSubmitting}
                        className={`flex-1 py-3 text-[13px] font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                            isFormValid && !isSubmitting
                                ? 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        {isSubmitting ? 'Processing...' : 'Confirm Revert'}
                    </button>
                </div>
            </div>
        </div>
    );
};
