import React from 'react';
import {
    Activity, Shield, AlertCircle, Eye,
    CheckCircle, Clock, AlertTriangle, Target
} from 'lucide-react';
import { useCalibrationReport, useSetOutcome } from '../hooks/useCalibration';
import { CalibrationProject } from '../types';

const OUTCOME_OPTIONS = ['ON_TIME', 'DELAYED', 'ESCALATED'] as const;

const OUTCOME_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
    ON_TIME: { label: 'On Time', color: 'text-emerald-700', bg: 'bg-emerald-50' },
    DELAYED: { label: 'Delayed', color: 'text-amber-700', bg: 'bg-amber-50' },
    ESCALATED: { label: 'Escalated', color: 'text-rose-700', bg: 'bg-rose-50' },
};

function getRiskLabel(health: number | null) {
    if (health === null) return { label: 'No Data', color: 'text-gray-400', Icon: Activity };
    if (health < 40) return { label: 'Stable', color: 'text-emerald-600', Icon: Shield };
    if (health < 60) return { label: 'Watch', color: 'text-amber-600', Icon: Eye };
    return { label: 'At Risk', color: 'text-rose-600', Icon: AlertCircle };
}

export const CalibrationDashboard: React.FC = () => {
    const { data: report, isLoading } = useCalibrationReport();
    const setOutcomeMutation = useSetOutcome();

    if (isLoading) return <div className="animate-pulse h-64 bg-slate-100 dark:bg-slate-800 rounded-xl" />;
    if (!report) return null;

    const { projects, stats } = report;

    return (
        <div className="space-y-6">
            {/* Stats Header */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatBox label="Completed" value={stats.totalCompleted} icon={CheckCircle} color="text-emerald-600" bg="bg-emerald-50" />
                <StatBox label="Health Captured" value={stats.withHealthData} icon={Activity} color="text-blue-600" bg="bg-blue-50" />
                <StatBox label="Outcomes Tagged" value={stats.withOutcome} icon={Target} color="text-indigo-600" bg="bg-indigo-50" />
                <StatBox label="Calibrated" value={stats.calibrated} icon={Shield} color="text-purple-600" bg="bg-purple-50" />
                <StatBox
                    label="Accuracy"
                    value={stats.accuracy !== null ? `${stats.accuracy}%` : '—'}
                    icon={Target}
                    color={stats.accuracy !== null && stats.accuracy >= 70 ? 'text-emerald-600' : 'text-amber-600'}
                    bg={stats.accuracy !== null && stats.accuracy >= 70 ? 'bg-emerald-50' : 'bg-amber-50'}
                />
            </div>

            {/* Calibration Insight */}
            {stats.accuracy !== null && (
                <div className={`p-4 rounded-lg border ${stats.accuracy >= 70
                    ? 'bg-emerald-50 border-emerald-200'
                    : stats.accuracy >= 50
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-rose-50 border-rose-200'}`}>
                    <div className={`flex items-center gap-2 text-sm font-medium ${stats.accuracy >= 70 ? 'dark:text-emerald-900' : stats.accuracy >= 50 ? 'dark:text-amber-900' : 'dark:text-rose-900'}`}>
                        {stats.accuracy >= 70 ? (
                            <><Shield className="w-4 h-4 text-emerald-600" /> Engine predictions correlate well with outcomes ({stats.accuracy}% accuracy)</>
                        ) : stats.accuracy >= 50 ? (
                            <><AlertTriangle className="w-4 h-4 text-amber-600" /> Engine needs tuning — {stats.accuracy}% accuracy. Review false positives/negatives below.</>
                        ) : (
                            <><AlertCircle className="w-4 h-4 text-rose-600" /> Low accuracy ({stats.accuracy}%). Significant recalibration needed.</>
                        )}
                    </div>
                </div>
            )}

            {/* Project Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Prediction vs Actual Outcome</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tag actual outcomes to build calibration data</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50/50 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-3 font-medium">Project</th>
                                <th className="px-6 py-3 font-medium">Completed</th>
                                <th className="px-6 py-3 font-medium">Health at Completion</th>
                                <th className="px-6 py-3 font-medium">Prediction</th>
                                <th className="px-6 py-3 font-medium">Actual Outcome</th>
                                <th className="px-6 py-3 font-medium">Match</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                            {projects.map(project => (
                                <CalibrationRow
                                    key={project.id}
                                    project={project}
                                    onSetOutcome={(outcome) =>
                                        setOutcomeMutation.mutate({ projectId: project.id, actualOutcome: outcome })
                                    }
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ============================================
// COMPONENTS
// ============================================

const CalibrationRow: React.FC<{
    project: CalibrationProject;
    onSetOutcome: (outcome: string) => void;
}> = ({ project, onSetOutcome }) => {
    const risk = getRiskLabel(project.healthAtCompletion);
    const RiskIcon = risk.Icon;
    const completedDate = project.completedAt
        ? new Date(project.completedAt).toLocaleDateString()
        : '—';

    // Determine if prediction matched reality
    let matchStatus: 'correct' | 'wrong' | 'pending' = 'pending';
    if (project.healthAtCompletion !== null && project.actualOutcome) {
        const predicted = project.healthAtCompletion >= 60 ? 'AT_RISK' : project.healthAtCompletion >= 40 ? 'WATCH' : 'STABLE';
        const wasProblematic = project.actualOutcome !== 'ON_TIME';
        matchStatus = ((predicted !== 'STABLE' && wasProblematic) || (predicted === 'STABLE' && !wasProblematic))
            ? 'correct' : 'wrong';
    }

    return (
        <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
            <td className="px-6 py-3">
                <div className="font-medium text-slate-900 dark:text-slate-100">{project.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{project.clientName}</div>
            </td>
            <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{completedDate}</td>
            <td className="px-6 py-3">
                {project.healthAtCompletion !== null
                    ? <span className="font-bold text-slate-700 dark:text-slate-300">{Math.round(project.healthAtCompletion)}</span>
                    : <span className="text-slate-400 dark:text-slate-500 italic">Not captured</span>
                }
            </td>
            <td className="px-6 py-3">
                <div className="flex items-center gap-1.5">
                    <RiskIcon className={`w-4 h-4 ${risk.color}`} />
                    <span className={`text-sm font-medium ${risk.color}`}>{risk.label}</span>
                </div>
            </td>
            <td className="px-6 py-3">
                {project.actualOutcome ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${OUTCOME_DISPLAY[project.actualOutcome].color} ${OUTCOME_DISPLAY[project.actualOutcome].bg}`}>
                        {OUTCOME_DISPLAY[project.actualOutcome].label}
                    </span>
                ) : (
                    <select
                        className="text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        defaultValue=""
                        onChange={(e) => {
                            if (e.target.value) onSetOutcome(e.target.value);
                        }}
                    >
                        <option value="" disabled className="dark:bg-slate-800">Tag outcome…</option>
                        {OUTCOME_OPTIONS.map(o => (
                            <option key={o} value={o} className="dark:bg-slate-800">{OUTCOME_DISPLAY[o].label}</option>
                        ))}
                    </select>
                )}
            </td>
            <td className="px-6 py-3">
                {matchStatus === 'correct' && <span className="text-emerald-600 font-bold text-xs">✓ Correct</span>}
                {matchStatus === 'wrong' && <span className="text-rose-600 font-bold text-xs">✗ Missed</span>}
                {matchStatus === 'pending' && <span className="text-gray-400 text-xs">—</span>}
            </td>
        </tr>
    );
};

const StatBox: React.FC<{
    label: string; value: number | string; icon: React.FC<any>; color: string; bg: string;
}> = ({ label, value, icon: StatIcon, color, bg }) => (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg}`}>
            <StatIcon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        </div>
    </div>
);
