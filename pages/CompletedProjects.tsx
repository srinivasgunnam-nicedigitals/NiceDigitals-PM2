
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { Project, ProjectStage, UserRole } from '../types';
import { format, parseISO } from 'date-fns';
import { Search, Archive, ArrowRight, User as UserIcon, Calendar, CheckCircle, MoreVertical, RotateCcw } from 'lucide-react';
import { ProjectDetailModal } from '../components/ProjectDetailModal';
import { EmptyState } from '../components/EmptyState';
import { Input, Badge, Button } from '../components/ui';
import { useModal } from '../hooks/useModal';

const CompletedProjects = () => {
  const { projects, users, currentUser, unarchiveProject } = useApp();
  const { showConfirm } = useModal();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const completedProjects = useMemo(() => {
    let list = projects.filter(p => p.stage === ProjectStage.COMPLETED);

    // Non-admins only see their own completed work
    if (currentUser?.role !== UserRole.ADMIN) {
      list = list.filter(p =>
        p.assignedDesignerId === currentUser?.id ||
        p.assignedDevManagerId === currentUser?.id ||
        p.assignedQAId === currentUser?.id
      );
    }

    return list.sort((a, b) => {
      const dateA = a.completedAt ? parseISO(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? parseISO(b.completedAt).getTime() : 0;
      return dateB - dateA; // Newest first
    });
  }, [projects, currentUser]);

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h2 className="text-[24px] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">Archive Vault</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 uppercase tracking-widest text-xs">Closed & Successfully Delivered Projects</p>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        {completedProjects.length === 0 ? (
          <EmptyState
            icon={Archive}
            title="Archive Empty"
            description="No projects have been marked as completed yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="px-8 py-6 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Client & Title</th>
                  <th className="px-8 py-6 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Production Leads</th>
                  <th className="px-8 py-6 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Delivery Date</th>
                  <th className="px-8 py-6 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-8 py-6 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest text-right">Records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {completedProjects.map(project => {
                  const designer = users.find(u => u.id === project.assignedDesignerId);
                  const dev = users.find(u => u.id === project.assignedDevManagerId);

                  return (
                    <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 dark:text-slate-100 text-lg tracking-tight group-hover:text-indigo-600 transition-colors">{project.name}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{project.clientName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {[designer, dev].filter(Boolean).map(lead => (
                              <img key={lead?.id} src={lead?.avatar} className="w-7 h-7 rounded-full border-2 border-white shadow-sm" alt="" title={lead?.name} />
                            ))}
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                            {designer?.name.split(' ')[0]} & {dev?.name.split(' ')[0]}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-300 dark:text-slate-500" />
                          <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                            {project.completedAt ? format(parseISO(project.completedAt), 'MMM d, yyyy') : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                          Finalized
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {currentUser?.role === UserRole.ADMIN && (
                            <button
                              onClick={async () => {
                                const confirmed = await showConfirm({
                                  title: 'Unarchive Project',
                                  message: 'Are you sure you want to restore this project? It will be moved back to Admin Review stage.',
                                  variant: 'warning',
                                  confirmText: 'Restore',
                                  cancelText: 'Cancel'
                                });
                                if (confirmed) {
                                  unarchiveProject(project.id);
                                }
                              }}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                              title="Unarchive Project"
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}
                          <Button
                            variant="secondary"
                            size="md"
                            onClick={() => setSelectedProject(project)}
                          >
                            <ArrowRight className="w-5 h-5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
};

export default CompletedProjects;
