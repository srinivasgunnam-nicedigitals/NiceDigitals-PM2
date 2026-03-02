import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Project } from '../../types';
import { backendApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { STAGE_ORDER } from '../../constants/stageOrder';
import { Lock, Calendar, Info, Edit2 } from 'lucide-react';
import { DeadlineEditModal } from './DeadlineEditModal';

interface StageDeadlinePanelProps {
    project: Project;
}

const STAGE_CONFIGS = [
    { key: 'DESIGN', label: 'Design', deadlineField: 'designDeadline' as const, isClient: false },
    { key: 'DEVELOPMENT', label: 'Development', deadlineField: 'developmentDeadline' as const, isClient: false },
    { key: 'INTERNAL_QA', label: 'Internal QA', deadlineField: 'internalQaDeadline' as const, isClient: false },
    { key: 'INTERNAL_APPROVAL', label: 'Approval', deadlineField: 'approvalDeadline' as const, isClient: false },
    { key: 'CLIENT_REVIEW', label: 'Client Review', deadlineField: 'clientReviewDeadline' as const, isClient: true },
    { key: 'CLIENT_UAT', label: 'Client UAT', deadlineField: 'clientUatDeadline' as const, isClient: true },
    { key: 'DEPLOYMENT', label: 'Deployment', deadlineField: 'deploymentDeadline' as const, isClient: false },
];

export function StageDeadlinePanel({ project }: StageDeadlinePanelProps) {
    const { currentUser } = useAuth();
    const currentStageIndex = STAGE_ORDER.indexOf(project.stage as any);
    const [editModalConfig, setEditModalConfig] = React.useState<{stage: string, label: string, current: string | null} | null>(null);

    // Fetch tenant scheduling config for the autoAllocate banner
    const { data: config, isLoading } = useQuery({
        queryKey: ['scheduling-config', currentUser?.tenantId],
        queryFn: () => backendApi.getSchedulingConfig(currentUser!.tenantId),
        enabled: !!currentUser?.tenantId,
        staleTime: 60000 // Cache it slightly longer to avoid unneeded checks
    });

    const tenantAutoAllocate = config?.autoAllocate ?? true; // Default to true visually if loading

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Stage Deadlines</h3>
                </div>
            </div>

            {/* Governance Banner */}
            {tenantAutoAllocate ? (
                <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100 flex items-start gap-2">
                    <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-indigo-900">
                        Internal stage deadlines are automatically calculated.
                    </p>
                </div>
            ) : (
                <div className="px-6 py-3 bg-amber-50/50 border-b border-amber-100 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-amber-900">
                        This tenant uses manual stage deadline allocation.
                    </p>
                </div>
            )}

            <div className="p-0">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                        <tr>
                            <th className="px-6 py-3">Stage</th>
                            <th className="px-6 py-3">Deadline</th>
                            <th className="px-6 py-3 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {STAGE_CONFIGS.map((config) => {
                            const stageIndex = STAGE_ORDER.indexOf(config.key as any);
                            const isLocked = stageIndex < currentStageIndex && currentStageIndex !== -1;
                            const deadlineValue = project[config.deadlineField];
                            
                            // Determine Badge
                            let badge = null;
                            if (isLocked) {
                                badge = (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-semibold">
                                        <Lock className="w-3 h-3" /> Locked
                                    </span>
                                );
                            } else if (!deadlineValue) {
                                badge = (
                                    <span className="inline-flex items-center px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-semibold">
                                        Not Set
                                    </span>
                                );
                            } else if (config.isClient) {
                                badge = (
                                    <span className="inline-flex items-center px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs font-semibold">
                                        Manual
                                    </span>
                                );
                            } else {
                                // Deadline exists, internal stage, not locked.
                                // It could be auto or manual depending on whether the tenant uses autoAllocate,
                                // but the spec says: "deadline exists & stage is internal -> Blue 'Auto'"
                                badge = (
                                    <span className="inline-flex items-center px-2 py-1 rounded bg-sky-100 text-sky-700 text-xs font-semibold">
                                        {tenantAutoAllocate ? 'Auto' : 'Manual'}
                                    </span>
                                );
                            }

                            return (
                                <tr key={config.key} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-3.5 font-medium text-slate-900">
                                        {config.label}
                                    </td>
                                    <td className="px-6 py-3.5 text-slate-600 font-medium">
                                        {deadlineValue ? new Date(deadlineValue).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            timeZone: 'UTC' // Enforce UTC rendering to avoid local timezone shifts
                                        }) : <span className="text-slate-400">—</span>}
                                    </td>
                                    <td className="px-6 py-3.5 text-right w-32">
                                        <div className="flex items-center justify-end gap-3">
                                            {badge}
                                            {/* Step 1: Governance Guard: Never render edit button for locked stages */}
                                            {(!isLocked) && (
                                                <button
                                                    onClick={() => setEditModalConfig({ stage: config.key, label: config.label, current: deadlineValue as string | null })}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                                    title={`Edit ${config.label} deadline`}
                                                >
                                                    <Edit2 className="w-[14px] h-[14px]" />
                                                </button>
                                            )}
                                            {isLocked && <div className="w-[26px]"></div> /* Placeholder to keep alignment */}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {editModalConfig && (
                <DeadlineEditModal
                    projectId={project.id}
                    stage={editModalConfig.stage}
                    stageLabel={editModalConfig.label}
                    currentDeadline={editModalConfig.current}
                    overallDeadline={project.overallDeadline}
                    onClose={() => setEditModalConfig(null)}
                />
            )}
        </div>
    );
}
