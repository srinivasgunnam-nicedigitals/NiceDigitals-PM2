
import React, { useState } from 'react';
import { Bell, CheckCircle, AlertCircle, MessageSquare, UserPlus, Clock, X, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export interface Notification {
    id: string;
    type: 'assignment' | 'deadline' | 'comment' | 'completion' | 'qa_feedback';
    title: string;
    message: string;
    projectId?: string;
    projectName?: string;
    userId?: string;
    timestamp: string;
    read: boolean;
}

interface NotificationPanelProps {
    notifications: Notification[];
    onClose: () => void;
    onMarkAsRead: (notificationId: string) => void;
    onMarkAllAsRead: () => void;
    onClearAll: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
    notifications,
    onClose,
    onMarkAsRead,
    onMarkAllAsRead,
    onClearAll
}) => {
    const unreadCount = notifications.filter(n => !n.read).length;

    const getNotificationIcon = (type: Notification['type']) => {
        switch (type) {
            case 'assignment':
                return <UserPlus size={18} className="text-blue-500" />;
            case 'deadline':
                return <Clock size={18} className="text-amber-500" />;
            case 'comment':
                return <MessageSquare size={18} className="text-purple-500" />;
            case 'completion':
                return <CheckCircle size={18} className="text-emerald-500" />;
            case 'qa_feedback':
                return <AlertCircle size={18} className="text-red-500" />;
            default:
                return <Bell size={18} className="text-slate-400" />;
        }
    };

    const groupNotificationsByDate = (notifications: Notification[]) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups: { [key: string]: Notification[] } = {
            Today: [],
            Yesterday: [],
            'This Week': []
        };

        notifications.forEach(notification => {
            const notifDate = parseISO(notification.timestamp);
            const diffDays = Math.floor((today.getTime() - notifDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                groups.Today.push(notification);
            } else if (diffDays === 1) {
                groups.Yesterday.push(notification);
            } else if (diffDays <= 7) {
                groups['This Week'].push(notification);
            }
        });

        return groups;
    };

    const groupedNotifications = groupNotificationsByDate(notifications);

    return (
        <div className="fixed inset-0 z-[60]" onClick={onClose}>
            <div
                className="absolute top-16 right-4 w-96 max-h-[600px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-saas-fade"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Bell size={20} />
                            Notifications
                        </h3>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <X size={18} className="text-slate-400" />
                        </button>
                    </div>

                    {unreadCount > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {unreadCount} unread
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={onMarkAllAsRead}
                                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                >
                                    Mark all as read
                                </button>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <button
                                    onClick={onClearAll}
                                    className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                                >
                                    Clear all
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Notifications List */}
                <div className="overflow-y-auto max-h-[500px]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                                <Bell size={24} className="text-slate-400" />
                            </div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">No notifications</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                                You're all caught up! We'll notify you when something happens.
                            </p>
                        </div>
                    ) : (
                        Object.entries(groupedNotifications).map(([group, notifs]) => (
                            notifs.length > 0 && (
                                <div key={group} className="py-2">
                                    <p className="px-6 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        {group}
                                    </p>
                                    {notifs.map((notification) => (
                                        <div
                                            key={notification.id}
                                            onClick={() => !notification.read && onMarkAsRead(notification.id)}
                                            className={`px-6 py-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer ${!notification.read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {getNotificationIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                            {notification.title}
                                                        </p>
                                                        {!notification.read && (
                                                            <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-1.5"></div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                                                        {notification.message}
                                                    </p>
                                                    {notification.projectName && (
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                                            Project: {notification.projectName}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                                        {format(parseISO(notification.timestamp), 'h:mm a')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
