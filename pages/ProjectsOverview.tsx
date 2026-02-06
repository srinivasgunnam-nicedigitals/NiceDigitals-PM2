
import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useApp } from '../store';
import { useModal } from '../hooks/useModal';
import { Project, ProjectStage, UserRole } from '../types';
import { format, parseISO } from 'date-fns';
import { Search, Filter, ArrowRight, User as UserIcon, Calendar, Clock, ArrowUpDown, ArrowUp, ArrowDown, Inbox, Archive, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { STAGE_CONFIG } from '../constants';
import { ProjectDetailModal } from '../components/ProjectDetailModal';
import { EmptyState } from '../components/EmptyState';
import { SkeletonTableRow } from '../components/Skeleton';

type SortField = 'client' | 'deadline';
type SortOrder = 'asc' | 'desc';

const ProjectsOverview = () => {
  const { projects, users, clients, isLoading, archiveProject, currentUser, deleteProject, page, setPage, paginationMeta } = useApp();
  const { showConfirm, showPrompt } = useModal();
  const { onAddProject } = useOutletContext<{ onAddProject: () => void }>();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [clientFilter, setClientFilter] = useState<string>('ALL');
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

  const filteredProjects = useMemo(() => {
    let list = projects.filter(p => p.stage !== ProjectStage.COMPLETED);

    if (statusFilter !== 'ALL') {
      list = list.filter(p => p.stage === statusFilter);
    }
    if (clientFilter !== 'ALL') {
      list = list.filter(p => p.clientName === clientFilter);
    }

    if (sortField) {
      list = [...list].sort((a, b) => {
        let valA = '';
        let valB = '';
        if (sortField === 'client') {
          valA = a.clientName.toLowerCase();
          valB = b.clientName.toLowerCase();
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
  }, [projects, statusFilter, clientFilter, sortField, sortOrder]);

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
            <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium mt-2">Managing {filteredProjects.length} active production records</p>
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
          {isLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('client')}>
                      <div className="flex items-center gap-2">Client <SortIcon field="client" /></div>
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Project Title</th>
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
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('client')}>
                      <div className="flex items-center gap-2">Client <SortIcon field="client" /></div>
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Project Title</th>
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
                            <button
                              onClick={async () => {
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
                              className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all"
                              title="Archive Project"
                            >
                              <Archive size={16} />
                            </button>
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
          {paginationMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                Showing <span className="font-bold text-slate-900 dark:text-slate-100">{((page - 1) * paginationMeta.limit) + 1}</span> to <span className="font-bold text-slate-900 dark:text-slate-100">{Math.min(page * paginationMeta.limit, paginationMeta.total)}</span> of <span className="font-bold text-slate-900 dark:text-slate-100">{paginationMeta.total}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[13px] font-bold text-slate-700 dark:text-slate-300 shadow-sm">
                  Page {page} of {paginationMeta.totalPages}
                </div>
                <button
                  onClick={() => setPage(Math.min(paginationMeta.totalPages, page + 1))}
                  disabled={page === paginationMeta.totalPages}
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
