
import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface InlineEditProps {
    value: string;
    onSave: (newValue: string) => Promise<void>;
    type?: 'text' | 'date';
    placeholder?: string;
    className?: string;
}

export const InlineEdit: React.FC<InlineEditProps> = ({
    value,
    onSave,
    type = 'text',
    placeholder = 'Click to edit',
    className = ''
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = async () => {
        if (editValue.trim() === '') {
            setError('Value cannot be empty');
            return;
        }

        if (editValue === value) {
            setIsEditing(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await onSave(editValue);
            setIsEditing(false);
        } catch (err) {
            setError('Failed to save');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setEditValue(value);
        setError(null);
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <div className="flex-1">
                    <input
                        ref={inputRef}
                        type={type}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        className={`w-full px-2 py-1 border rounded-lg text-sm ${error
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500'
                            } bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 ${className}`}
                    />
                    {error && (
                        <p className="text-xs text-red-500 mt-1">{error}</p>
                    )}
                </div>
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors disabled:opacity-50"
                    title="Save"
                >
                    <Check size={16} />
                </button>
                <button
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="p-1 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 rounded transition-colors disabled:opacity-50"
                    title="Cancel"
                >
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 px-2 py-1 rounded transition-colors ${className}`}
            title="Click to edit"
        >
            {value || <span className="text-slate-400 italic">{placeholder}</span>}
        </div>
    );
};
