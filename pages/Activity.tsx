
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApp } from '../store';
import { backendApi } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import { Activity as ActivityIcon, Clock, MessageSquare, CheckCircle, UserPlus, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Derive the correct icon from the action string (case-insensitive)
const getActivityIcon = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes('comment')) {
        return (
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <MessageSquare size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
        );
    }
    if (lower.includes('completed') || lower.includes('complete')) {
        return (
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
        );
    }
    if (lower.includes('assigned') || lower.includes('assign')) {
        return (
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <UserPlus size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
        );
    }
    return (
        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center">
            <Clock size={18} className="text-slate-600 dark:text-slate-400" />
        </div>
    );
};

const Activity = () => {
    const { users, currentUser } = useApp();

    const { data: activities = [], isLoading } = useQuery({
        queryKey: ['activity-feed'],
        queryFn: () => backendApi.getActivityFeed(100),
        enabled: !!currentUser,
        // Refetch periodically so the feed stays fresh as projects change
        refetchInterval: 30 * 1000,
    });

    return (
        <div className="p-8 space-y-6 pb-12">
            <div>
                <h2 className="text-[24px] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">Activity Feed</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Real-time updates across all projects</p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            ) : activities.length === 0 ? (
                <EmptyState
                    icon={ActivityIcon}
                    title="No activity yet"
                    description="Project updates and changes will appear here as they happen."
                />
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {activities.map((activity, index) => {
                            const user = activity.userId ? users.find(u => u.id === activity.userId) : null;
                            const userName = user ? user.name : 'System';
                            return (
                                <div
                                    key={`${activity.id}-${index}`}
                                    className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 mt-1">
                                            {getActivityIcon(activity.action)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-0.5">{activity.action}</h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                                                        Project: <span className="font-semibold">{activity.projectName}</span>
                                                    </p>
                                                </div>
                                                <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700">
                                                    {format(parseISO(activity.timestamp), 'MMM d, h:mm a')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-3">
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={`https://picsum.photos/seed/${activity.userId ?? 'system'}/24/24`}
                                                        className="w-5 h-5 rounded-full ring-2 ring-white dark:ring-slate-800"
                                                        alt=""
                                                    />
                                                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{userName}</span>
                                                </div>
                                                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                                <span className="text-[11px] font-medium text-slate-400">{activity.projectName}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Activity;
