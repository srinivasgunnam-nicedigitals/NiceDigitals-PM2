
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: () => void;
    actionLabel?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon,
    title,
    description,
    action,
    actionLabel
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 animate-saas-fade">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-6 shadow-inner">
                <Icon className="w-10 h-10 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2 text-center">
                {title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-300 text-center max-w-md mb-6">
                {description}
            </p>
            {action && actionLabel && (
                <button
                    onClick={action}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};
