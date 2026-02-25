
import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useApp } from '../store';
import { useQuery } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import { useModal } from '../hooks/useModal';
import { Project, ProjectStage, UserRole, Priority } from '../types';
import { format, parseISO } from 'date-fns';
import { Search, Filter, ArrowRight, User as UserIcon, Calendar, Clock, ArrowUpDown, ArrowUp, ArrowDown, Inbox, Archive, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { STAGE_CONFIG } from '../constants';
import { ProjectDetailModal } from '../components/ProjectDetailModal';
import { EmptyState } from '../components/EmptyState';
import { SkeletonTableRow } from '../components/Skeleton';

type SortField = 'priority' | 'deadline';
type SortOrder = 'asc' | 'desc';

const ProjectsOverview = () => {
  const { projects, users, clients, isLoading, archiveProject, currentUser, deleteProject, page, setPage, paginationMeta } = useApp();
  const { showConfirm, showPrompt } = useModal();
  const { onAddProject } = useOutletContext<{ onAddProject: () => void }>();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // --- SERVER-SIDE FILTERED QUERY ---
  // Tracks the page specifically for filtered results (resets on filter change)
  const [filteredPage, setFilteredPage] = useState(1);

  const hasActiveFilters = statusFilter !== 'ALL' || clientFilter !== 'ALL' || priorityFilter !== 'ALL';

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setFilteredPage(1);
  }, [statusFilter, clientFilter, priorityFilter]);

  const { data: filteredData, isLoading: filteredLoading } = useQuery({
    queryKey: ['projects-filtered', filteredPage, statusFilter, clientFilter, priorityFilter],
    queryFn: () => backendApi.getProjects(filteredPage, 10, {
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
      clientName: clientFilter !== 'ALL' ? clientFilter : undefined,
    }),
    enabled: hasActiveFilters,
  });

  // Use server-filtered results when any filter is active, otherwise fall back to store
  const activeProjects = hasActiveFilters
    ? (filteredData?.data || []).filter(p => p.stage !== ProjectStage.COMPLETED)
    : projects.filter(p => p.stage !== ProjectStage.COMPLETED);

  const activeMeta = hasActiveFilters ? filteredData?.meta : paginationMeta;
  const activePage = hasActiveFilters ? filteredPage : page;
  const setActivePage = hasActiveFilters ? setFilteredPage : setPage;
  const activeIsLoading = hasActiveFilters ? filteredLoading : isLoading;

  // Client-side sort only (data already filtered by server)
  const filteredProjects = useMemo(() => {
    let list = [...activeProjects];

    if (sortField) {
      list = list.sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';
        if (sortField === 'priority') {
          const weights: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          valA = weights[a.priority] || 0;
          valB = weights[b.priority] || 0;
        } else if (sortField === 'deadline') {
          valA = a.overallDeadline;
          valB = b.overallDeadline;
        }
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [activeProjects, sortField, sortOrder]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Page Header Banner */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 px-8 py-6 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-[24px] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">Projects Overview</h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium mt-2">Managing {activeMeta?.total ?? 0} active production records</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] font-bold focus:outline-none shadow-sm cursor-pointer text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Clients</option>
              {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] font-bold focus:outline-none shadow-sm cursor-pointer text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Status</option>
              {Object.values(ProjectStage).filter(s => s !== ProjectStage.COMPLETED).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] font-bold focus:outline-none shadow-sm cursor-pointer text-slate-900 dark:text-slate-100"
            >
              <option value="ALL">All Priorities</option>
              {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {currentUser?.role === UserRole.ADMIN && (
              <button
                onClick={() => onAddProject()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-bold rounded-lg shadow-sm transition-all"
              >
                <Plus size={16} strokeWidth={3} />
                New Project
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="p-8 max-w-[1400px] mx-auto w-full flex-1">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
          {activeIsLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Project Title</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('priority')}>
                      <div className="flex items-center gap-2">Priority <SortIcon field="priority" /></div>
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Current Phase</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Start</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('deadline')}>
                      <div className="flex items-center gap-2">Deadline <SortIcon field="deadline" /></div>
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Lead</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} />)}
                </tbody>
              </table>
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No active projects"
              description="All projects are either completed or haven't been created yet."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Project Title</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('priority')}>
                      <div className="flex items-center gap-2">Priority <SortIcon field="priority" /></div>
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Current Phase</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Start</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('deadline')}>
                      <div className="flex items-center gap-2">Deadline <SortIcon field="deadline" /></div>
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Lead</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredProjects.map(project => {
                    const designer = users.find(u => u.id === project.assignedDesignerId);
                    const dev = users.find(u => u.id === project.assignedDevManagerId);
                    const lead = project.stage === ProjectStage.DESIGN ? designer : (dev || designer);
                    return (
                      <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-6 py-5">
                          <span className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400">{project.clientName}</span>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">{project.name}</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider ${project.priority === Priority.URGENT ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                            project.priority === Priority.HIGH ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                              project.priority === Priority.MEDIUM ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                                'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                            {project.priority}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex w-32 justify-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${STAGE_CONFIG[project.stage].color}`}>
                            {STAGE_CONFIG[project.stage].label}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                          {format(parseISO(project.createdAt), 'MMM d')}
                        </td>
                        <td className="px-6 py-5">
                          <div className={`flex items-center gap-1.5 text-[13px] font-bold ${project.isDelayed ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            <Calendar size={14} className={project.isDelayed ? 'text-red-500 dark:text-red-400' : 'text-slate-300 dark:text-slate-500'} />
                            {format(parseISO(project.overallDeadline), 'MMM d, yyyy')}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            {lead ? (
                              <>
                                <img src={lead.avatar} className="w-6 h-6 rounded-md shadow-sm" alt="" />
                                <span className="text-[12px] font-bold text-slate-900 dark:text-slate-100">{lead.name.split(' ')[0]}</span>
                              </>
                            ) : <span className="text-[11px] font-bold text-slate-300 dark:text-slate-600">N/A</span>}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">

                            {currentUser?.role === UserRole.ADMIN && (
                              <button
                                onClick={async () => {
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
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                title="Delete Project"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            <button onClick={() => setSelectedProject(project)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700/50 rounded-lg transition-all">
                              <ArrowRight size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {(activeMeta?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                Showing <span className="font-bold text-slate-900 dark:text-slate-100">{((activePage - 1) * (activeMeta?.limit ?? 10)) + 1}</span> to <span className="font-bold text-slate-900 dark:text-slate-100">{Math.min(activePage * (activeMeta?.limit ?? 10), activeMeta?.total ?? 0)}</span> of <span className="font-bold text-slate-900 dark:text-slate-100">{activeMeta?.total ?? 0}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActivePage(Math.max(1, activePage - 1))}
                  disabled={activePage === 1}
                  className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                  Page {activePage} of {activeMeta?.totalPages ?? 1}
                </div>
                <button
                  onClick={() => setActivePage(Math.min(activeMeta?.totalPages ?? 1, activePage + 1))}
                  disabled={activePage === (activeMeta?.totalPages ?? 1)}
                  className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedProject && <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />}
    </div>
  );
};

export default ProjectsOverview;
