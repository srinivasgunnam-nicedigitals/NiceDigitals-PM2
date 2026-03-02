import React, { useState } from 'react';
import {
    Activity, Shield, Clock, Zap, CheckSquare,
    TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMyDiscipline, useTeamDiscipline } from '../hooks/useDiscipline';
import { DisciplineSnapshot } from '../types';

// Helper to determine status color
const getScoreColor = (score: number) => {
    if (score >= 0.5) return 'text-emerald-500 bg-emerald-50/70 border border-emerald-100/50';
    if (score >= 0) return 'text-amber-500 bg-amber-50/70 border border-amber-100/50';
    return 'text-rose-500 bg-rose-50/70 border border-rose-100/50';
};

// Helper for stability label
const getStabilityLabel = (index: number) => {
    if (index >= 70) return { label: 'Strong Stability', color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-100/50', icon: Shield };
    if (index >= 40) return { label: 'Moderate Stability', color: 'text-amber-600', bg: 'bg-amber-50 border border-amber-100/50', icon: Activity };
    return { label: 'Needs Attention', color: 'text-rose-600', bg: 'bg-rose-50 border border-rose-100/50', icon: AlertCircle };
};

export const DisciplineDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'ADMIN';

    const [view, setView] = useState<'my' | 'team'>('my');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Operational Discipline</h2>
                {isAdmin && (
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => setView('my')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'my' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            My Snapshot
                        </button>
                        <button
                            onClick={() => setView('team')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'team' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Team Overview
                        </button>
                    </div>
                )}
            </div>

            {view === 'my' ? <MyDisciplineView /> : <TeamDisciplineView />}
        </div>
    );
};

// ============================================
// INDIVIDUAL VIEW (Semi-transparent)
// ============================================
const MyDisciplineView: React.FC = () => {
    const { data, isLoading } = useMyDiscipline();
    const [expanded, setExpanded] = useState(false);

    if (isLoading) return <div className="animate-pulse h-32 bg-slate-100 dark:bg-slate-800 rounded-xl" />;
    if (!data?.latest) return (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-8 text-center border border-slate-100 dark:border-slate-700">
            <Activity className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
            <h3 className="text-slate-700 dark:text-slate-300 font-medium">No Discipline Data Yet</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Snapshots are generated daily based on project activity.</p>
        </div>
    );

    const { latest, previous } = data;
    const stability = getStabilityLabel(latest.disciplineIndex);
    const StatusIcon = stability.icon;

    // Trend calculation
    let trend = 'neutral';
    if (previous) {
        if (latest.disciplineIndex > previous.disciplineIndex + 2) trend = 'up';
        if (latest.disciplineIndex < previous.disciplineIndex - 2) trend = 'down';
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-transparent dark:border-slate-700/50 overflow-hidden">
            {/* Executive Summary Card */}
            <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg ${stability.bg}`}>
                            <StatusIcon className={`w-6 h-6 ${stability.color}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`text-lg font-bold ${stability.color}`}>{stability.label}</span>
                                {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                                {trend === 'down' && <TrendingDown className="w-4 h-4 text-rose-500" />}
                                {trend === 'neutral' && <Minus className="w-4 h-4 text-slate-400" />}
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Based on trailing 30-day activity</p>
                        </div>
                    </div>
                    {/* The index numbers are hidden from general users to avoid gamification, shown as a vague proxy or kept strictly internal. We expose just the pills here. */}
                </div>

                {/* 5 Signal Pills */}
                <div className="flex flex-wrap gap-2 mb-2">
                    <SignalPill label="QA Stability" score={latest.qaDomainScore} icon={Shield} />
                    <SignalPill label="Rework" score={latest.reworkDomainScore} icon={Activity} />
                    <SignalPill label="Checklist" score={latest.checklistDomainScore} icon={CheckSquare} />
                    <SignalPill label="Deadlines" score={latest.deadlineDomainScore} icon={Clock} />
                    <SignalPill label="Velocity" score={latest.velocityDomainScore} icon={Zap} />
                </div>
            </div>

            {/* Expandable Breakdown toggle */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
                <span className="font-medium">Raw Activity Analytics</span>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Raw Breakdown Panel */}
            {expanded && (
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard label="QA First-Pass Rate" value={`${latest.qaFirstPassCount} passes`} sub={`${latest.qaRejectCount} rejects`} />
                    <StatCard label="Total Reverts" value={latest.revertCount.toString()} sub={`${latest.highSevRevertCount} were high-severity`} />
                    <StatCard label="Checklist Completion" value={`${(latest.checklistAvgRate * 100).toFixed(0)}%`} sub="Average at stage exit" />
                    <StatCard label="On-Time Delivery" value={`${(latest.onTimeRate * 100).toFixed(0)}%`} sub={`Avg delay: ${latest.avgDelayDays.toFixed(1)} days`} />
                    <StatCard label="Stage Velocity" value={`${latest.avgStageDays.toFixed(1)} days`} sub={`Tenant Median: ${latest.tenantAvgStageDays.toFixed(1)}`} />
                </div>
            )}
        </div>
    );
};

// ============================================
// ADMIN TEAM OVERVIEW
// ============================================
const TeamDisciplineView: React.FC = () => {
    const { data: team, isLoading } = useTeamDiscipline();

    if (isLoading) return <div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-800 rounded-xl" />;
    if (!team || team.length === 0) return <div className="text-slate-500 dark:text-slate-400">No team data.</div>;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-transparent dark:border-slate-700/50 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                        <tr>
                            <th className="px-6 py-4 font-medium">Team Member</th>
                            <th className="px-6 py-4 font-medium">Index</th>
                            <th className="px-6 py-4 font-medium">QA</th>
                            <th className="px-6 py-4 font-medium">Rework</th>
                            <th className="px-6 py-4 font-medium">Checklist</th>
                            <th className="px-6 py-4 font-medium">Deadline</th>
                            <th className="px-6 py-4 font-medium">Velocity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {team.map(({ user, snapshot }) => (
                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {user.avatar ? (
                                            <img src={user.avatar} alt="" className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                                                {user.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-medium text-slate-900 dark:text-slate-100">{user.name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{user.role.replace('_', ' ')}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {snapshot ? (
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{Math.round(snapshot.disciplineIndex)}</span>
                                            {/* Admin sees raw index */}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 dark:text-slate-500 italic">No data</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">{snapshot && <SmallPill score={snapshot.qaDomainScore} />}</td>
                                <td className="px-6 py-4">{snapshot && <SmallPill score={snapshot.reworkDomainScore} />}</td>
                                <td className="px-6 py-4">{snapshot && <SmallPill score={snapshot.checklistDomainScore} />}</td>
                                <td className="px-6 py-4">{snapshot && <SmallPill score={snapshot.deadlineDomainScore} />}</td>
                                <td className="px-6 py-4">{snapshot && <SmallPill score={snapshot.velocityDomainScore} />}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ============================================
// UI COMPONENTS
// ============================================

const SignalPill: React.FC<{ label: string; score: number; icon: React.FC<any> }> = ({ label, score, icon: Icon }) => {
    const colorClass = getScoreColor(score);
    return (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border border-white/20 shadow-sm ${colorClass}`}>
            <Icon className="w-4 h-4 opacity-70" />
            {label}
        </div>
    );
};

const SmallPill: React.FC<{ score: number }> = ({ score }) => {
    const colorClass = getScoreColor(score);
    return <div className={`w-3 h-3 rounded-full mx-auto ${colorClass.split(' ')[1]}`} />;
};

const StatCard: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-transparent dark:border-slate-700/50 shadow-sm">
        <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-1">{label}</div>
        <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{value}</div>
        <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">{sub}</div>
    </div>
);
