
import React, { useEffect } from 'react';
import { useApp } from '../store';
import { Project, UserRole, ProjectStage } from '../types';
import { STAGE_CONFIG } from '../constants';
import { X, Bell, Calendar, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from './ui';

interface DailyReportModalProps {
  onClose: () => void;
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({ onClose }) => {
  const { projects, currentUser } = useApp();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const activeProjects = projects.filter(p => {
    if (p.stage === ProjectStage.COMPLETED) return false;
    if (currentUser?.role === UserRole.ADMIN) return true;
    return (
      p.assignedDesignerId === currentUser?.id ||
      p.assignedDevManagerId === currentUser?.id ||
      p.assignedQAId === currentUser?.id
    );
  });

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between bg-indigo-600 text-white">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Bell className="w-6 h-6 text-indigo-200" />
              <h2 className="text-2xl font-black tracking-tight uppercase">Daily Project Briefing</h2>
            </div>
            <p className="text-indigo-100 font-bold text-xs uppercase tracking-widest opacity-80">
              {format(new Date(), 'EEEE, MMMM do yyyy')} • {currentUser?.role === UserRole.ADMIN ? 'Global Agency Report' : 'Your Personal Agenda'}
            </p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30 dark:bg-slate-900/50">
          {activeProjects.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <Clock className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-black uppercase tracking-widest text-sm">No Active Items to report today</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Project / Client</th>
                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Current Stage</th>
                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Deadline</th>
                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Alerts</th>
                    <th className="px-6 py-4 text-[10px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-widest text-right">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {activeProjects.map(project => {
                    const deadlineDate = project.currentDeadline ? parseISO(project.currentDeadline) : parseISO(project.overallDeadline);
                    const progress = project.stage === ProjectStage.UPCOMING ? 0 :
                      project.stage === ProjectStage.DESIGN ? 20 :
                        project.stage === ProjectStage.DEVELOPMENT ? 40 :
                          project.stage === ProjectStage.QA ? 60 : 80;

                    return (
                      <tr key={project.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 transition-colors">
                        <td className="px-6 py-5">
                          <p className="font-black text-slate-900 dark:text-slate-100 tracking-tight">{project.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">{project.clientName}</p>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex w-32 justify-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${STAGE_CONFIG[project.stage].color}`}>
                            {STAGE_CONFIG[project.stage].label}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                            <span className="text-xs font-black text-slate-700 dark:text-slate-300">{format(deadlineDate, 'MMM d, yyyy')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {project.isDelayed ? (
                            <div className="flex items-center gap-1.5 text-red-600">
                              <AlertCircle className="w-4 h-4 animate-pulse" />
                              <span className="text-[10px] font-black uppercase">Delayed</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-emerald-500 uppercase">On Track</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400">{progress}%</span>
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

        <div className="px-10 py-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-end">
          <Button
            variant="primary"
            size="lg"
            onClick={onClose}
          >
            Acknowledge & Close
          </Button>
        </div>
      </div>
    </div>
  );
};
