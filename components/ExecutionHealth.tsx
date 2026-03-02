import React, { useState } from 'react';
import {
    Shield, AlertTriangle, AlertCircle, Eye,
    ChevronDown, ChevronUp, Clock, Activity,
    CheckSquare, Zap, Users
} from 'lucide-react';
import { useExecutionHealth } from '../hooks/useExecutionHealth';
import { ExecutionHealth } from '../types';

// =============================================
// KANBAN CARD BADGE (Compact)
// =============================================
export const ExecutionHealthBadge: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { data: health, isLoading } = useExecutionHealth(projectId);

    if (isLoading || !health) return null;

    const { label, color, bgColor, Icon } = getRiskDisplay(health.executionHealth);
    
    // Compute primary driver for tooltip
    const domains = [
        { key: 'deadlinePressure', value: health.breakdown.deadlinePressure, text: 'timeline buffer narrowing' },
        { key: 'reworkInstability', value: health.breakdown.reworkInstability, text: 'frequent rework transitions' },
        { key: 'checklistPenalty', value: health.breakdown.checklistPenalty, text: 'low checklist completion' },
        { key: 'stageDeviation', value: health.breakdown.stageDeviation, text: 'prolonged stage duration' },
        { key: 'disciplineModifier', value: health.breakdown.disciplineModifier, text: 'team discipline factors' }
    ];
    
    let tooltipText = `Delivery Confidence: ${health.deliveryConfidence}%`;
    
    if (health.executionHealth >= 40) {
        const positiveDrivers = domains.filter(d => d.value > 0);
        if (positiveDrivers.length > 0) {
            const primary = positiveDrivers.reduce((max, d) => d.value > max.value ? d : max);
            tooltipText = `Risk increased due to ${primary.text}`;
        }
    }

    return (
        <div className={`inline-flex flex-col gap-0.5 group relative`}>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color} ${bgColor} cursor-help`} title={tooltipText}>
                <Icon className="w-3 h-3" />
                {label}
            </div>
            
            {/* Custom hover tooltip for better visibility than native title */}
            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10 w-48 text-[10px] bg-slate-800 text-white rounded p-1.5 shadow-lg">
                {tooltipText}
            </div>
        </div>
    );
};

// =============================================
// PROJECT DETAIL BREAKDOWN (Expandable)
// =============================================
export const ExecutionHealthBreakdown: React.FC<{ projectId: string }> = ({ projectId }) => {
    const { data: health, isLoading } = useExecutionHealth(projectId);
    const [expanded, setExpanded] = useState(false);

    if (isLoading) return <div className="animate-pulse h-12 bg-gray-100 rounded-lg" />;
    if (!health) return null;

    const { label, color, bgColor, Icon } = getRiskDisplay(health.executionHealth);

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Summary Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${bgColor}`}>
                        <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="text-left">
                        <div className={`text-sm font-bold ${color}`}>{label}</div>
                        <div className="text-xs text-gray-500">
                            Delivery Confidence: {health.deliveryConfidence}%
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {health.atRisk && (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">AT RISK</span>
                    )}
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
            </button>

            {/* Expandable Breakdown */}
            {expanded && (
                <div className="px-5 pb-5 border-t border-gray-100 space-y-3 pt-4">
                    <BreakdownRow
                        icon={Clock}
                        label="Deadline Pressure"
                        value={health.breakdown.deadlinePressure}
                        max={40}
                        description={getDeadlineDesc(health.breakdown.deadlinePressure)}
                    />
                    <BreakdownRow
                        icon={Activity}
                        label="Rework Instability"
                        value={health.breakdown.reworkInstability}
                        max={30}
                        description={getReworkDesc(health.breakdown.reworkInstability)}
                    />
                    <BreakdownRow
                        icon={CheckSquare}
                        label="Checklist Discipline"
                        value={health.breakdown.checklistPenalty}
                        max={20}
                        description={getChecklistDesc(health.breakdown.checklistPenalty)}
                    />
                    <BreakdownRow
                        icon={Zap}
                        label="Stage Duration"
                        value={health.breakdown.stageDeviation}
                        max={20}
                        description={getStageDesc(health.breakdown.stageDeviation)}
                    />
                    <BreakdownRow
                        icon={Users}
                        label="Team Stability"
                        value={health.breakdown.disciplineModifier}
                        max={10}
                        isDiscipline
                        description={getDisciplineDesc(health.breakdown.disciplineModifier)}
                    />
                </div>
            )}
        </div>
    );
};

// =============================================
// INTERNAL HELPERS
// =============================================

function getRiskDisplay(executionHealth: number) {
    if (executionHealth < 40) {
        return { label: 'On Track', color: 'text-emerald-600', bgColor: 'bg-emerald-50', Icon: Shield };
    }
    if (executionHealth < 60) {
        return { label: 'Watch Closely', color: 'text-amber-600', bgColor: 'bg-amber-50', Icon: Eye };
    }
    return { label: 'At Risk', color: 'text-rose-600', bgColor: 'bg-rose-50', Icon: AlertCircle };
}

const BreakdownRow: React.FC<{
    icon: React.FC<any>;
    label: string;
    value: number;
    max: number;
    description: string;
    isDiscipline?: boolean;
}> = ({ icon: RowIcon, label, value, max, description, isDiscipline }) => {
    const severity = isDiscipline
        ? (value <= -5 ? 'text-emerald-600' : value >= 5 ? 'text-rose-600' : 'text-gray-600')
        : (value === 0 ? 'text-emerald-600' : value <= max * 0.4 ? 'text-amber-600' : 'text-rose-600');

    const displayValue = isDiscipline
        ? (value >= 0 ? `+${value}` : `${value}`)
        : `+${value}`;

    return (
        <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div className="flex items-center gap-3">
                <RowIcon className="w-4 h-4 text-gray-400" />
                <div>
                    <div className="text-sm font-medium text-gray-700">{label}</div>
                    <div className="text-xs text-gray-400">{description}</div>
                </div>
            </div>
            <span className={`text-sm font-bold ${severity}`}>{displayValue}</span>
        </div>
    );
};

// Description helpers
function getDeadlineDesc(v: number): string {
    if (v === 0) return 'Comfortable buffer';
    if (v <= 10) return 'Moderate buffer (3–7 days)';
    if (v <= 20) return 'Tight (< 3 days remaining)';
    if (v <= 35) return 'Overdue (< 7 days behind)';
    return 'Critically overdue';
}

function getReworkDesc(v: number): string {
    if (v === 0) return 'No recent rework';
    if (v <= 8) return 'Low rework activity';
    if (v <= 15) return 'Moderate rework detected';
    return 'High rework instability';
}

function getChecklistDesc(v: number): string {
    if (v === 0) return 'Checklist ≥ 95% complete';
    if (v <= 5) return 'Checklist 80–95% complete';
    if (v <= 10) return 'Checklist 60–80% complete';
    return 'Checklist < 60% complete';
}

function getStageDesc(v: number): string {
    if (v === 0) return 'Within normal range';
    if (v <= 10) return '10–25% slower than median';
    return '> 25% slower than median';
}

function getDisciplineDesc(v: number): string {
    if (v <= -10) return 'Strong team discipline';
    if (v < 0) return 'Good team discipline';
    if (v === 0) return 'Average team discipline';
    return 'Below-average team discipline';
}
