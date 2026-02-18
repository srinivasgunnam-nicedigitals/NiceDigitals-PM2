import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { Project, UserRole, TeamLeadRole, ProjectTeamMember } from '../types';
import { useApp } from '../store';
import { useModal } from '../hooks/useModal';
import { UserPlus, Edit3, Trash2, Users } from 'lucide-react';

interface TeamTabProps {
    project: Project;
}

export const TeamTab: React.FC<TeamTabProps> = ({ project }) => {
    const { currentUser, users } = useApp();
    const { showConfirm, showPrompt } = useModal();
    const queryClient = useQueryClient();
    const [editingMember, setEditingMember] = useState<ProjectTeamMember | null>(null);
    const [showAddForm, setShowAddForm] = useState<{ leadRole: TeamLeadRole } | null>(null);

    // Fetch team members
    const { data: teamMembers = [], isLoading } = useQuery({
        queryKey: ['team-members', project.id],
        queryFn: () => backendApi.getTeamMembers(project.id)
    });

    const isAdmin = currentUser?.role === UserRole.ADMIN;
    const isDesignLead = currentUser?.id === project.assignedDesignerId;
    const isDevLead = currentUser?.id === project.assignedDevManagerId;

    const canManageTeam = (leadRole: TeamLeadRole) => {
        if (isAdmin) return true;
        if (leadRole === TeamLeadRole.DESIGN && isDesignLead) return true;
        if (leadRole === TeamLeadRole.DEV && isDevLead) return true;
        return false;
    };

    const handleAddMember = async (leadRole: TeamLeadRole, data: { name: string; roleTitle: string; notes?: string }) => {
        try {
            // VERSION INJECTION: Extract version at mutation time
            const currentProject = queryClient.getQueryData<Project>(['project', project.id]);
            const version = currentProject?.version;

            if (version === undefined || version === null) {
                throw new Error('Project version not available');
            }

            await backendApi.addTeamMember(project.id, {
                leadRole,
                name: data.name,
                roleTitle: data.roleTitle,
                notes: data.notes,
                version // VERSION HARD GUARD enforced
            });

            // NO OPTIMISTIC UPDATE - Query invalidation only
            await queryClient.invalidateQueries({ queryKey: ['projects'] });
            await queryClient.invalidateQueries({ queryKey: ['project', project.id] });
            await queryClient.invalidateQueries({ queryKey: ['team-members', project.id] });

            setShowAddForm(null);
        } catch (error: any) {
            // 409 conflicts automatically handled by axios interceptor
            console.error('Failed to add team member:', error);
        }
    };

    const handleUpdateMember = async (memberId: string, data: { name?: string; roleTitle?: string; notes?: string }) => {
        try {
            // VERSION INJECTION: Extract version at mutation time
            const currentProject = queryClient.getQueryData<Project>(['project', project.id]);
            const version = currentProject?.version;

            if (version === undefined || version === null) {
                throw new Error('Project version not available');
            }

            await backendApi.updateTeamMember(project.id, memberId, {
                ...data,
                version // VERSION HARD GUARD enforced
            });

            // NO OPTIMISTIC UPDATE - Query invalidation only
            await queryClient.invalidateQueries({ queryKey: ['projects'] });
            await queryClient.invalidateQueries({ queryKey: ['project', project.id] });
            await queryClient.invalidateQueries({ queryKey: ['team-members', project.id] });

            setEditingMember(null);
        } catch (error: any) {
            // 409 conflicts automatically handled by axios interceptor
            console.error('Failed to update team member:', error);
        }
    };

    const handleDeleteMember = async (member: ProjectTeamMember) => {
        const confirmed = await showConfirm({
            title: 'Remove Team Member',
            message: `Are you sure you want to remove ${member.name} from the team?`,
            confirmText: 'Remove',
            cancelText: 'Cancel',
            variant: 'error'
        });

        if (!confirmed) return;

        try {
            // VERSION INJECTION: Extract version at mutation time
            const currentProject = queryClient.getQueryData<Project>(['project', project.id]);
            const version = currentProject?.version;

            if (version === undefined || version === null) {
                throw new Error('Project version not available');
            }

            await backendApi.deleteTeamMember(project.id, member.id, version); // VERSION HARD GUARD enforced

            // NO OPTIMISTIC UPDATE - Query invalidation only
            await queryClient.invalidateQueries({ queryKey: ['projects'] });
            await queryClient.invalidateQueries({ queryKey: ['project', project.id] });
            await queryClient.invalidateQueries({ queryKey: ['team-members', project.id] });
        } catch (error: any) {
            // 409 conflicts automatically handled by axios interceptor
            console.error('Failed to delete team member:', error);
        }
    };

    const designTeam = teamMembers.filter(m => m.leadRole === TeamLeadRole.DESIGN);
    const devTeam = teamMembers.filter(m => m.leadRole === TeamLeadRole.DEV);

    const designLead = users.find(u => u.id === project.assignedDesignerId);
    const devLead = users.find(u => u.id === project.assignedDevManagerId);
    const qaLead = users.find(u => u.id === project.assignedQAId);

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Design Team Section */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-[14px] font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Users size={16} className="text-indigo-500" />
                            Design Team
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1">Lead: {designLead?.name || 'Unassigned'}</p>
                    </div>
                    {canManageTeam(TeamLeadRole.DESIGN) && (
                        <button
                            onClick={() => setShowAddForm({ leadRole: TeamLeadRole.DESIGN })}
                            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all"
                        >
                            <UserPlus size={14} />
                            Add Member
                        </button>
                    )}
                </div>

                {designTeam.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-[12px]">No team members yet</div>
                ) : (
                    <div className="space-y-3">
                        {designTeam.map(member => (
                            <TeamMemberCard
                                key={member.id}
                                member={member}
                                canManage={canManageTeam(TeamLeadRole.DESIGN)}
                                onEdit={() => setEditingMember(member)}
                                onDelete={() => handleDeleteMember(member)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Dev Team Section */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-[14px] font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Users size={16} className="text-emerald-500" />
                            Development Team
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1">Lead: {devLead?.name || 'Unassigned'}</p>
                    </div>
                    {canManageTeam(TeamLeadRole.DEV) && (
                        <button
                            onClick={() => setShowAddForm({ leadRole: TeamLeadRole.DEV })}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
                        >
                            <UserPlus size={14} />
                            Add Member
                        </button>
                    )}
                </div>

                {devTeam.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-[12px]">No team members yet</div>
                ) : (
                    <div className="space-y-3">
                        {devTeam.map(member => (
                            <TeamMemberCard
                                key={member.id}
                                member={member}
                                canManage={canManageTeam(TeamLeadRole.DEV)}
                                onEdit={() => setEditingMember(member)}
                                onDelete={() => handleDeleteMember(member)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* QA Team Section (Read-only) */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 opacity-60">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-[14px] font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Users size={16} className="text-amber-500" />
                            QA Team
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1">Lead: {qaLead?.name || 'Unassigned'}</p>
                    </div>
                </div>
                <div className="text-center py-8 text-slate-400 text-[12px]">QA team members not supported in this version</div>
            </div>

            {/* Add/Edit Form Modal */}
            {(showAddForm || editingMember) && (
                <TeamMemberForm
                    member={editingMember}
                    leadRole={showAddForm?.leadRole || editingMember!.leadRole}
                    onSave={(data) => {
                        if (editingMember) {
                            handleUpdateMember(editingMember.id, data);
                        } else if (showAddForm) {
                            handleAddMember(showAddForm.leadRole, data as any);
                        }
                    }}
                    onCancel={() => {
                        setShowAddForm(null);
                        setEditingMember(null);
                    }}
                />
            )}
        </div>
    );
};

// Team Member Card Component
const TeamMemberCard: React.FC<{
    member: ProjectTeamMember;
    canManage: boolean;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ member, canManage, onEdit, onDelete }) => {
    return (
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex-1">
                <h4 className="text-[13px] font-bold text-slate-900 dark:text-white">{member.name}</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{member.roleTitle}</p>
                {member.notes && <p className="text-[11px] text-slate-400 mt-1 italic">{member.notes}</p>}
            </div>
            {canManage && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={onEdit}
                        className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Edit"
                    >
                        <Edit3 size={14} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                        title="Remove"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

// Team Member Form Component
const TeamMemberForm: React.FC<{
    member: ProjectTeamMember | null;
    leadRole: TeamLeadRole;
    onSave: (data: { name: string; roleTitle: string; notes?: string }) => void;
    onCancel: () => void;
}> = ({ member, leadRole, onSave, onCancel }) => {
    const [name, setName] = useState(member?.name || '');
    const [roleTitle, setRoleTitle] = useState(member?.roleTitle || '');
    const [notes, setNotes] = useState(member?.notes || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !roleTitle.trim()) return;
        onSave({ name: name.trim(), roleTitle: roleTitle.trim(), notes: notes.trim() || undefined });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-xl shadow-2xl p-6">
                <h3 className="text-[16px] font-bold text-slate-900 dark:text-white mb-4">
                    {member ? 'Edit Team Member' : `Add ${leadRole === TeamLeadRole.DESIGN ? 'Design' : 'Dev'} Team Member`}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100"
                            required
                            maxLength={100}
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Role/Title *
                        </label>
                        <input
                            type="text"
                            value={roleTitle}
                            onChange={(e) => setRoleTitle(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100"
                            required
                            maxLength={100}
                        />
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-slate-100 resize-none"
                            maxLength={500}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[12px] rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || !roleTitle.trim()}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold text-[12px] rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {member ? 'Update' : 'Add'} Member
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
