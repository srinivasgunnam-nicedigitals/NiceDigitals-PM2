import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useApp } from '../store';
import { useTheme } from '../ThemeContext';
import { useModal } from '../hooks/useModal';
import { UserRole, ProjectStage, Project, Priority } from '../types';
import { ProjectCard } from '../components/ProjectCard';
import { ProjectDetailModal } from '../components/ProjectDetailModal';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard, SkeletonStat, SkeletonChart } from '../components/Skeleton';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { BulkActionToolbar } from '../components/BulkActionToolbar';
import { Button } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Trophy,
  CheckCircle,
  Plus,
  Layers,
  Zap,
  Activity,
  BarChart3,
  Archive,
  Search,
  ChevronDown,
  LayoutGrid,
  Columns as ColumnsIcon,
  AlertCircle as AlertIcon,
  FolderOpen,
  Inbox,
  CheckSquare,
  Square,
  X,
  Download,
  Calendar,
  Trash2
} from 'lucide-react';
import { parseISO, format, differenceInDays } from 'date-fns';
import { STAGE_CONFIG, PRIORITY_CONFIG } from '../constants';

const AdminOverview = () => {
  const { projects, getDevRankings, isLoading } = useApp();
  const { theme } = useTheme();
  const axisColor = theme === 'dark' ? '#cbd5e1' : '#64748b';
  const [chartFilter, setChartFilter] = useState<ProjectStage | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const rankings = getDevRankings();

  const stageData = useMemo(() => {
    const data: Record<string, number> = {
      'Upcoming': projects.filter(p => p.stage === ProjectStage.UPCOMING).length,
      'Design': projects.filter(p => p.stage === ProjectStage.DESIGN).length,
      'Dev': projects.filter(p => p.stage === ProjectStage.DEVELOPMENT).length,
      'QA': projects.filter(p => p.stage === ProjectStage.QA).length,
      'Review': projects.filter(p => p.stage === ProjectStage.ADMIN_REVIEW).length,
    };

    const colors: Record<string, string> = {
      'Upcoming': '#3b82f6',
      'Design': '#a855f7',
      'Dev': '#10b981',
      'QA': '#f59e0b',
      'Review': '#ec4899',
    };

    return Object.entries(data).map(([name, count]) => ({ name, count, color: colors[name] || '#6366f1' }));
  }, [projects]);

  const handleChartClick = (data: any) => {
    if (data && data.stage) {
      setChartFilter(chartFilter === data.stage ? null : data.stage);
    }
  };

  const clearFilter = () => setChartFilter(null);

  const exportChartAsCSV = () => {
    const csv = [
      ['Stage', 'Count'],
      ...stageData.map(d => [d.name, d.count])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-distribution-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const overdueCount = projects.filter(p => p.isDelayed && p.stage !== ProjectStage.COMPLETED).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
        ) : (
          [
            { label: 'Active Pipeline', value: projects.filter(p => p.stage !== ProjectStage.COMPLETED).length, icon: <Activity size={18} />, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'In Production', value: projects.filter(p => p.stage === ProjectStage.DEVELOPMENT).length, icon: <Zap size={18} />, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Attention Req.', value: overdueCount, icon: <AlertIcon size={18} />, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Completed', value: projects.filter(p => p.stage === ProjectStage.COMPLETED).length, icon: <CheckCircle size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{stat.value}</h4>
              </div>
              <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 size={16} className="text-slate-400" /> Allocation Distribution
              </h3>
              {chartFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilter}
                  className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50"
                >
                  Filtered: {STAGE_CONFIG[chartFilter].label}
                  <X size={14} />
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Live Load</span>
            </div>
          </div>
          <div className="h-64" style={{ minHeight: '16rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="name" fontSize={11} fontWeight="600" axisLine={false} tickLine={false} tick={{ fill: axisColor }} />
                <YAxis fontSize={11} fontWeight="600" axisLine={false} tickLine={false} tick={{ fill: axisColor }} />
                <Tooltip
                  cursor={{ fill: theme === 'dark' ? '#334155' : '#f8fafc' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    fontSize: '12px',
                    backgroundColor: theme === 'dark' ? '#1e293b' : '#fff',
                    color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                  }}
                  labelStyle={{ color: theme === 'dark' ? '#cbd5e1' : '#64748b', fontWeight: 'bold' }}
                  itemStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                  onClick={handleChartClick}
                  cursor="pointer"
                >
                  {stageData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={chartFilter === entry.name ? '#4f46e5' : entry.color}
                      opacity={chartFilter && chartFilter !== entry.name ? 0.3 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Trophy size={16} className="text-amber-500" /> Top Contributors
            </h3>
          </div>
          <div className="space-y-4">
            {rankings.slice(0, 4).map((rank, i) => (
              <div key={rank.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <span className="text-[11px] font-bold text-slate-400 w-4">0{i + 1}</span>
                <img src={`https://picsum.photos/seed/${rank.userId}/32/32`} className="w-8 h-8 rounded-md" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate">{rank.userName}</p>
                  <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-indigo-500 h-full" style={{ width: `${Math.min((rank.monthlyPoints / 50) * 100, 100)}%` }}></div>
                  </div>
                </div>
                <span className="text-[12px] font-bold text-slate-900 dark:text-slate-100">{rank.monthlyPoints}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface KanbanColumnProps {
  stage: ProjectStage;
  projects: Project[];
  onProjectClick: (p: Project) => void;
  onAddProject?: (stage: ProjectStage) => void;
  key?: any;
}

const KanbanColumn = ({ stage, projects, onProjectClick, onAddProject }: KanbanColumnProps) => {
  const { archiveProject, currentUser, deleteProject } = useApp();
  const { showConfirm, showPrompt } = useModal();
  return (
    <div className="min-w-[300px] w-full flex flex-col group/col">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{STAGE_CONFIG[stage].label}</h3>
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">{projects.length}</span>
        </div>
        {currentUser?.role === UserRole.ADMIN && (
          <button
            onClick={() => onAddProject?.(stage)}
            className="p-1 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded opacity-0 group-hover/col:opacity-100 transition-opacity"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      <div className="flex-1 space-y-3 bg-slate-100/50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-200/40 dark:border-slate-700/40 min-h-[400px]">
        {projects.map(project => (
          <div
            key={project.id}
            onClick={() => onProjectClick(project)}
            className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${PRIORITY_CONFIG[project.priority].color}`}>
                {project.priority}
              </span>
              {project.isDelayed && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
            </div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate flex-1 min-w-0">{project.name}</h4>
              {project.stage !== ProjectStage.COMPLETED && (
                <>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      const confirmed = await showConfirm({
                        title: 'Archive Project',
                        message: 'Are you sure you want to archive this project? It will be moved to the archive.',
                        variant: 'warning',
                        confirmText: 'Archive',
                        cancelText: 'Cancel'
                      });
                      if (confirmed) {
                        archiveProject(project.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md opacity-0 group-hover:opacity-100 transition-all ml-2"
                    title="Archive Project"
                  >
                    <Archive size={14} />
                  </button>
                  {currentUser?.role === UserRole.ADMIN && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const confirmation = await showPrompt({
                          title: 'Delete Project',
                          message: "To permanently delete this project, type 'DELETE':",
                          placeholder: 'DELETE',
                          confirmText: 'Delete',
                          cancelText: 'Cancel',
                          validate: (value) => {
                            if (value !== 'DELETE') {
                              return 'You must type DELETE exactly to confirm';
                            }
                            return true;
                          }
                        });
                        if (confirmation) {
                          await deleteProject(project.id, confirmation);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md opacity-0 group-hover:opacity-100 transition-all ml-1"
                      title="Delete Project"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-3">{project.clientName}</p>
            <div className="flex items-center justify-between">
              <div className="flex -space-x-1.5">
                {[project.assignedDesignerId, project.assignedDevManagerId].filter(Boolean).slice(0, 2).map(id => (
                  <img key={id} src={`https://picsum.photos/seed/${id}/24/24`} className="w-5 h-5 rounded ring-2 ring-white dark:ring-slate-800" alt="" />
                ))}
              </div>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {format(parseISO(project.overallDeadline), 'MMM d')}
              </span>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="This stage is empty. Projects will appear here as they progress."
          />
        )}
      </div>
    </div>
  );
};

const RoleSpecificDashboard = () => {
  const { currentUser, projects, isLoading, users, bulkUpdateStage, bulkAssignUser, bulkArchiveProjects, bulkDeleteProjects, page, setPage, paginationMeta } = useApp();
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<'board' | 'grid'>('board');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());

  // Access global modal trigger from Layout
  const { onAddProject } = useOutletContext<{ onAddProject: () => void }>();

  const selectedProject = useMemo(() =>
    projects.find(p => p.id === selectedProjectId) || null
    , [projects, selectedProjectId]);

  useKeyboardShortcuts(
    [
      {
        key: 'n',
        callback: () => onAddProject(),
        description: 'New Project',
      },
    ],
    []
  );

  const filteredProjects = useMemo(() => {
    if (currentUser?.role === UserRole.ADMIN) return projects;
    return projects.filter(p =>
      p.assignedDesignerId === currentUser?.id ||
      p.assignedDevManagerId === currentUser?.id ||
      p.assignedQAId === currentUser?.id
    );
  }, [projects, currentUser]);

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(filteredProjects.map(p => p.id)));
    }
  };

  const clearSelection = () => setSelectedProjects(new Set());

  const handleBulkStageChange = (stage: ProjectStage) => {
    bulkUpdateStage(Array.from(selectedProjects), stage);
    clearSelection();
  };

  const handleBulkAssign = (userId: string, role: 'designer' | 'dev' | 'qa') => {
    bulkAssignUser(Array.from(selectedProjects), userId, role);
    clearSelection();
  };

  const handleBulkArchive = () => {
    bulkArchiveProjects(Array.from(selectedProjects));
    clearSelection();
  };

  const handleBulkDelete = () => {
    bulkDeleteProjects(Array.from(selectedProjects));
    clearSelection();
  };

  const activeStages = Object.values(ProjectStage).filter(s => s !== ProjectStage.COMPLETED);

  return (
    <div className="flex flex-col h-full min-h-screen">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 px-8 py-6 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-[24px] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
              {currentUser?.role === UserRole.ADMIN ? 'Overview' : 'My Workspace'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {filteredProjects.length > 0 && (
              <Button
                variant="secondary"
                size="md"
                onClick={toggleSelectAll}
              >
                {selectedProjects.size === filteredProjects.length && selectedProjects.size > 0 ? (
                  <CheckSquare size={18} className="text-indigo-600" />
                ) : (
                  <Square size={18} className="text-slate-400" />
                )}
                <span className="text-sm font-semibold">
                  {selectedProjects.size > 0 ? `${selectedProjects.size} selected` : 'Select All'}
                </span>
              </Button>
            )}

            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('board')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <ColumnsIcon size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
            {currentUser?.role === UserRole.ADMIN && (
              <Button
                variant="primary"
                size="md"
                onClick={() => onAddProject()}
              >
                <Plus size={16} strokeWidth={3} />
                New Project
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8 max-w-[1400px] mx-auto w-full flex-1">
        {currentUser?.role === UserRole.ADMIN && <AdminOverview />}

        <div className="mt-6">
          {viewMode === 'board' ? (
            <div className="flex gap-6 overflow-x-auto pb-6 scroll-smooth custom-scrollbar">
              {activeStages.map(stage => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  projects={filteredProjects.filter(p => p.stage === stage)}
                  onProjectClick={(p) => setSelectedProjectId(p.id)}
                  onAddProject={() => onAddProject()}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredProjects.filter(p => p.stage !== ProjectStage.COMPLETED).map(project => (
                <ProjectCard key={project.id} project={project} onClick={() => setSelectedProjectId(project.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedProject && <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProjectId(null)} />}

      {selectedProjects.size > 0 && (
        <BulkActionToolbar
          selectedCount={selectedProjects.size}
          onClearSelection={clearSelection}
          onBulkStageChange={handleBulkStageChange}
          onBulkAssign={handleBulkAssign}
          onBulkArchive={handleBulkArchive}
          onBulkDelete={handleBulkDelete}
          users={users}
        />
      )}

      {/* Pagination Toolbar */}
      <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4 shadow-lg z-20">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Showing page <span className="font-bold text-slate-900 dark:text-slate-100">{paginationMeta.page}</span> of <span className="font-bold text-slate-900 dark:text-slate-100">{paginationMeta.totalPages}</span>
            <span className="mx-2">•</span>
            Total <span className="font-bold text-slate-900 dark:text-slate-100">{paginationMeta.total}</span> projects
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, paginationMeta.totalPages) }, (_, i) => {
                // Logic to show generic page window, simple for now: 1..5 or around current
                // For sprint speed, just show generic range or simple dots if huge.
                // Actually, let's keep it simple: Just Next/Prev is sufficient for "Visibility".
                // Numbered pages nice to have but trickier logic.
                // Let's just do numbers if totalPages < 10, else simple.

                let pNum = i + 1;
                if (paginationMeta.totalPages > 5 && page > 3) {
                  pNum = page - 2 + i;
                }
                if (pNum > paginationMeta.totalPages) return null;

                return (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${page === pNum
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= paginationMeta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSpecificDashboard;

const AlertCircle = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
