
import React from 'react';
import { Project, ProjectStage, UserRole, Priority } from '../types';
import { PRIORITY_CONFIG } from '../constants';
import { CheckSquare } from 'lucide-react';
import { useApp } from '../store';
import { Card, Badge } from './ui';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const { currentUser, users, updateProject } = useApp();

  // Calculate checklist progress aggregated across all phases
  const getChecklistProgress = () => {
    const allTasks = [
      ...(project.designChecklist || []),
      ...(project.devChecklist || []),
      ...(project.qaChecklist || []),
      ...(project.finalChecklist || [])
    ];

    const completed = allTasks.filter(i => i.completed).length;
    const total = allTasks.length;

    return { completed, total };
  };

  // Calculate overall progress percentage
  const getProgressPercentage = () => {
    const { completed, total } = getChecklistProgress();
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  const handleAssignmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation(); // Prevent card click
    const userId = e.target.value;
    if (currentUser?.role === UserRole.ADMIN) {
      // Convert empty string to null to avoid foreign key constraint violations
      updateProject(project.id, { assignedDesignerId: userId === '' ? null : userId, version: project.version });
    }
  };

  const checklistProgress = getChecklistProgress();
  const progressPercentage = getProgressPercentage();
  const designers = users.filter(u => u.role === UserRole.DESIGNER);
  const assignedDesigner = users.find(u => u.id === project.assignedDesignerId);

  // Determine badge variant based on priority
  const getBadgeVariant = (): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    switch (project.priority) {
      case Priority.URGENT:
        return 'error';
      case Priority.HIGH:
        return 'warning';
      case Priority.MEDIUM:
        return 'info';
      case Priority.LOW:
      default:
        return 'default';
    }
  };

  return (
    <Card
      padding="md"
      hoverable
      onClick={onClick}
      className="cursor-pointer flex flex-col gap-3"
    >
      {/* Header: Project name and Priority */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-0.5 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {project.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{project.clientName}</p>
        </div>
        <Badge variant={getBadgeVariant()} size="sm">
          {PRIORITY_CONFIG[project.priority].label}
        </Badge>
      </div>

      {/* Progress Bar & Count */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Tasks Completed</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {checklistProgress.completed}/{checklistProgress.total}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Checklist Progress */}
      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <CheckSquare size={14} className="text-slate-400 dark:text-slate-500" />
        <span className="font-medium">{checklistProgress.completed}/{checklistProgress.total}</span>
      </div>

      {/* Assignment Dropdown */}
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Assign Designer:
        </label>
        {currentUser?.role === UserRole.ADMIN ? (
          <select
            value={project.assignedDesignerId || ''}
            onChange={handleAssignmentChange}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-xs px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-slate-900 dark:text-slate-100 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
          >
            <option value="">Select Designer...</option>
            {designers.map(designer => (
              <option key={designer.id} value={designer.id}>
                {designer.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-xs px-2 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300">
            {assignedDesigner?.name || 'Not assigned'}
          </div>
        )}
      </div>
    </Card>
  );
};
