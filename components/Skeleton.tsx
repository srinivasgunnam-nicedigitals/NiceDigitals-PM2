
import React from 'react';

export const SkeletonCard: React.FC = () => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 animate-saas-fade">
            <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer"></div>
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer"></div>
            </div>
            <div className="flex-1">
                <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-700 rounded mb-2 animate-shimmer"></div>
                <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded mb-5 animate-shimmer"></div>
                <div className="flex items-center gap-4 mb-5">
                    <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer"></div>
                    <div className="flex -space-x-1.5">
                        <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-md animate-shimmer"></div>
                        <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-md animate-shimmer"></div>
                    </div>
                </div>
            </div>
            <div className="mt-auto space-y-3">
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full animate-shimmer"></div>
                <div className="flex items-center justify-between">
                    <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer"></div>
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer"></div>
                </div>
            </div>
        </div>
    );
};

export const SkeletonTableRow: React.FC = () => {
    return (
        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <td className="px-6 py-5">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer"></div>
            </td>
            <td className="px-6 py-5">
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer"></div>
            </td>
            <td className="px-6 py-5">
                <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer"></div>
            </td>
            <td className="px-6 py-5">
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer"></div>
            </td>
            <td className="px-6 py-5">
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer"></div>
            </td>
            <td className="px-6 py-5">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-md animate-shimmer"></div>
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer"></div>
                </div>
            </td>
            <td className="px-6 py-5 text-right">
                <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-lg ml-auto animate-shimmer"></div>
            </td>
        </tr>
    );
};

export const SkeletonStat: React.FC = () => {
    return (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div>
                <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-2 animate-shimmer"></div>
                <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer"></div>
            </div>
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-shimmer"></div>
        </div>
    );
};

export const SkeletonChart: React.FC = () => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-8">
                <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer"></div>
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-shimmer"></div>
            </div>
            <div className="h-64 flex items-end justify-around gap-4">
                {[60, 80, 45, 90, 70].map((height, i) => (
                    <div
                        key={i}
                        className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-t animate-shimmer"
                        style={{ height: `${height}%` }}
                    ></div>
                ))}
            </div>
        </div>
    );
};
