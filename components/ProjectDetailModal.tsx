
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { backendApi } from '../services/api';
import DOMPurify from 'dompurify';
import { Project, ProjectStage, UserRole, Comment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUsers } from '../hooks/useUsers';
import { useUpdateProject, useDeleteProject, useAdvanceStage } from '../hooks/useProjectMutations';
import { useRecordQAFeedback } from '../hooks/useProjectQA';
import { useAddComment, useDeleteComment } from '../hooks/useProjectComments';
import { useModal } from '../hooks/useModal';
import { STAGE_CONFIG } from '../constants';
import {
  X, CheckCircle, Send, AlertTriangle, ChevronRight,
  MessageSquare, History, Clock, User as UserIcon, Shield,
  Save, Bold, Italic, List as ListIcon, UserPlus, ExternalLink,
  RotateCcw, Edit3, Link as LinkIcon, Image as ImageIcon, Calendar, Archive, Trash2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { TeamTab } from './TeamTab';
import { ChangeDeadlineModal } from './ChangeDeadlineModal';
import { ReassignLeadModal } from './ReassignLeadModal';
import { EditProjectModal } from './EditProjectModal';

interface ProjectDetailModalProps {
  project: Project;
  onClose: () => void;
}

const sanitizeScopeHtml = (html: string | undefined | null): string => {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html);
};

const ProjectCommentsSidebar = ({ project, onClose }: { project: Project; onClose: () => void }) => {
  const { currentUser } = useAuth();
  const { users } = useUsers();
  const addCommentMutation = useAddComment();
  const deleteCommentMutation = useDeleteComment();
  const [commentText, setCommentText] = useState('');

  const { data: commentsResponse, isLoading } = useQuery({
    queryKey: ['project-comments', project.id],
    queryFn: () => backendApi.getProjectComments(project.id, 1, 100)
  });
  const comments = commentsResponse?.data || [];

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentMutation.mutate({ projectId: project.id, text: commentText });
    setCommentText('');
  };

  const handleDelete = (commentId: string) => {
    deleteCommentMutation.mutate({ projectId: project.id, commentId });
  };

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB] dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700">
      <div className="px-6 h-[88px] border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between shrink-0">
        <h4 className="text-[12px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 uppercase tracking-wider">
          <MessageSquare size={14} className="text-indigo-500 dark:text-indigo-400" /> Activity Log
        </h4>
        <button onClick={onClose} className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors"><X size={20} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {isLoading ? <div className="p-4 text-center text-slate-400">Loading discussion...</div> :
          (!comments || comments.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40 grayscale">
              <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-center">No discussion yet</p>
            </div>
          ) : (
            comments.map((comment: Comment) => {
              const author = users.find(u => u.id === comment.userId);
              const isMe = comment.userId === currentUser?.id;
              return (
                <div key={comment.id} className="group flex flex-col gap-1.5 animate-saas-fade">
                  <div className="flex items-center gap-2">
                    <img src={author?.avatar} className="w-5 h-5 rounded" alt="" />
                    <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100">{author?.name}</span>
                    <span className="text-[10px] font-medium text-slate-400">{format(parseISO(comment.timestamp), 'h:mm a')}</span>
                    {/* Delete button: only visible on hover, only for own messages */}
                    {isMe && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={deleteCommentMutation.isPending}
                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-300 hover:text-red-500 dark:hover:text-red-400 rounded disabled:opacity-30"
                        title="Delete message"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <div className={`px-4 py-2.5 rounded-lg text-[13px] font-medium leading-relaxed border ${isMe ? 'bg-white dark:bg-slate-800 border-indigo-100 dark:border-indigo-900/50 text-slate-800 dark:text-slate-200 shadow-sm' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}>
                    {comment.text}
                  </div>
                </div>
              );
            })
          )}
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <form onSubmit={handlePost} className="relative">
          <textarea
            rows={2}
            placeholder="Write an update..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all text-[13px] font-medium resize-none shadow-inner"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (commentText.trim()) handlePost(e as any);
              }
            }}
          />
          <button
            type="submit"
            className="absolute right-2.5 bottom-3 p-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-md hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-40 transition-all active:scale-95"
            disabled={!commentText.trim()}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
};

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ project: initialProject, onClose }) => {
  const { data: project } = useQuery({
    queryKey: ['project', initialProject.id],
    queryFn: () => backendApi.getProject(initialProject.id),
    initialData: initialProject
  });

  const { data: historyResponse } = useQuery({
    queryKey: ['project-history', initialProject.id],
    queryFn: () => backendApi.getProjectHistory(initialProject.id, 1, 100)
  });
  const history = historyResponse?.data || [];

  const queryClient = useQueryClient();
  const { currentUser } = useAuth();
  const { users } = useUsers();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const advanceStageMutation = useAdvanceStage();
  const qaFeedbackMutation = useRecordQAFeedback();
  const { showConfirm, showPrompt } = useModal();
  const [activeTab, setActiveTab] = useState<'checklist' | 'details' | 'history' | 'team'>('checklist');
  const [editScope, setEditScope] = useState(sanitizeScopeHtml(project.scope));
  const [isSaving, setIsSaving] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [savedRange, setSavedRange] = useState<Range | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Phase 2A modal states
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Manual Add Task state
  const [newTaskText, setNewTaskText] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeadlineModal || showReassignModal || showEditModal || showLinkInput) return;
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showDeadlineModal, showReassignModal, showEditModal, showLinkInput]);

  useEffect(() => {
    const sanitized = sanitizeScopeHtml(project.scope);
    setEditScope(sanitized);
    if (editorRef.current) {
      editorRef.current.innerHTML = sanitized;
    }
  }, [project.scope, activeTab]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      setSavedRange(selection.getRangeAt(0));
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (selection && savedRange) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
  };

  const handleFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleToolbarClick = (type: 'bold' | 'italic' | 'list' | 'link') => {
    switch (type) {
      case 'bold': return handleFormat('bold');
      case 'italic': return handleFormat('italic');
      case 'list': return handleFormat('insertUnorderedList');
      case 'link':
        saveSelection();
        setShowLinkInput(true);
        setLinkUrl('');
        return;
    }
  };

  const applyLink = () => {
    restoreSelection();
    if (linkUrl) {
      let finalUrl = linkUrl.trim();
      if (!finalUrl.match(/^https?:\/\//i) && !finalUrl.match(/^mailto:/i)) {
        finalUrl = 'https://' + finalUrl;
      }
      handleFormat('createLink', finalUrl);
    }
    setShowLinkInput(false);
    setLinkUrl('');
    setSavedRange(null);
  };

  const cancelLink = () => {
    restoreSelection();
    setShowLinkInput(false);
    setLinkUrl('');
    setSavedRange(null);
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      if (e.ctrlKey || e.metaKey) {
        window.open((target as HTMLAnchorElement).href, '_blank');
      }
    }
  };

  const handleEditorKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const focusNode = selection.focusNode;
      if (!focusNode || focusNode.nodeType !== Node.TEXT_NODE) return;

      const text = focusNode.textContent || '';
      const offset = selection.focusOffset;

      if (e.key === ' ' && offset > 0) {
        const textBeforeCaret = text.slice(0, offset);
        const words = textBeforeCaret.trimEnd().split(/[\s\u00A0]+/);
        const lastWord = words[words.length - 1];

        if (/^(https?:\/\/|www\.)\S+$/i.test(lastWord)) {
          const endOffset = offset - 1;
          const startOffset = endOffset - lastWord.length;

          if (startOffset >= 0) {
            const range = document.createRange();
            range.setStart(focusNode, startOffset);
            range.setEnd(focusNode, endOffset);

            selection.removeAllRanges();
            selection.addRange(range);

            let url = lastWord;
            if (!/^https?:\/\//i.test(url)) {
              url = 'https://' + url;
            }

            document.execCommand('createLink', false, url);
            selection.collapse(focusNode, offset);
          }
        }
      }
    }
  };

  const handleEditorPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (/^(https?:\/\/|www\.)\S+$/i.test(text.trim())) {
      e.preventDefault();
      let url = text.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      document.execCommand('createLink', false, url);
    }
  };

  const handleSaveScope = () => {
    setIsSaving(true);
    updateProjectMutation.mutate({ id: project.id, updates: { scope: sanitizeScopeHtml(editScope), version: project.version } });
    setTimeout(() => { setIsSaving(false); }, 1000);
  };

  const handleAssignment = (role: UserRole, userId: string) => {
    if (currentUser?.role !== UserRole.ADMIN) return;
    const update: any = { version: project.version };
    if (role === UserRole.DESIGNER) update.assignedDesignerId = userId;
    if (role === UserRole.DEV_MANAGER) update.assignedDevManagerId = userId;
    if (role === UserRole.QA_ENGINEER) update.assignedQAId = userId;
    updateProjectMutation.mutate({ id: project.id, updates: update });
  };

  const getChecklistForStage = () => {
    switch (project.stage) {
      case ProjectStage.DESIGN: return { items: Array.isArray(project.designChecklist) ? project.designChecklist : [], key: 'designChecklist' };
      case ProjectStage.DEVELOPMENT: return { items: Array.isArray(project.devChecklist) ? project.devChecklist : [], key: 'devChecklist' };
      case ProjectStage.QA: return { items: Array.isArray(project.qaChecklist) ? project.qaChecklist : [], key: 'qaChecklist' };
      default: return { items: Array.isArray(project.finalChecklist) ? project.finalChecklist : [], key: 'finalChecklist' };
    }
  };

  const canModifyChecklist = currentUser?.role === UserRole.ADMIN || (
    (project.stage === ProjectStage.DESIGN && currentUser?.id === project.assignedDesignerId) ||
    (project.stage === ProjectStage.DEVELOPMENT && currentUser?.id === project.assignedDevManagerId) ||
    (project.stage === ProjectStage.QA && currentUser?.id === project.assignedQAId)
  );

  const toggleChecklistItem = (itemId: string) => {
    if (!canModifyChecklist) return;
    const { items, key } = getChecklistForStage();
    const newItems = items.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i);
    updateProjectMutation.mutate({ id: project.id, updates: { [key]: newItems, version: project.version } });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== UserRole.ADMIN || !newTaskText.trim()) return;

    const { items, key } = getChecklistForStage();
    const newTask = {
      id: `custom-task-${Date.now()}`,
      label: newTaskText.trim(),
      completed: false
    };

    const newItems = [...items, newTask];
    updateProjectMutation.mutate({ id: project.id, updates: { [key]: newItems, version: project.version } });
    setNewTaskText('');
  };

  const handleDeleteTask = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentUser?.role !== UserRole.ADMIN) return;

    const { items, key } = getChecklistForStage();
    const newItems = items.filter(i => i.id !== itemId);
    updateProjectMutation.mutate({ id: project.id, updates: { [key]: newItems, version: project.version } });
  };

  const handleDeleteAllTasks = async () => {
    if (currentUser?.role !== UserRole.ADMIN) return;

    const { items, key } = getChecklistForStage();
    if (items.length === 0) return;

    const confirmed = await showConfirm({
      title: 'Delete All Tasks',
      message: 'Are you sure you want to delete ALL tasks in this phase checklist? This cannot be undone.',
      confirmText: 'Delete All Tasks',
      cancelText: 'Cancel',
      variant: 'error'
    });

    if (confirmed) {
      updateProjectMutation.mutate({ id: project.id, updates: { [key]: [], version: project.version } });
    }
  };

  // Recalculate on every render to ensure reactivity
  const { items, key } = getChecklistForStage();
  const isChecklistComplete = items.length > 0 && items.every(i => i.completed);

  const getNextStage = () => {
    switch (project.stage) {
      case ProjectStage.UPCOMING: return ProjectStage.DESIGN;
      case ProjectStage.DESIGN: return ProjectStage.DEVELOPMENT;
      case ProjectStage.DEVELOPMENT: return ProjectStage.QA;
      case ProjectStage.QA: return ProjectStage.ADMIN_REVIEW;
      case ProjectStage.ADMIN_REVIEW: return ProjectStage.COMPLETED;
      default: return null;
    }
  };

  const nextStage = getNextStage();

  const handleDeleteProject = async () => {
    const confirmation = await showPrompt({
      title: 'Delete Project',
      message: "To permanently delete this project, type 'DELETE':",
      placeholder: 'DELETE',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      validate: (value) => {
        if (value !== 'DELETE') return 'You must type DELETE exactly to confirm';
        return true;
      }
    });
    if (confirmation === 'DELETE') {
      await deleteProjectMutation.mutateAsync(project.id);
      onClose();
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-saas-fade">
      <div className="bg-white dark:bg-slate-900 w-full max-w-[95vw] h-[95vh] rounded-xl shadow-[0_24px_100px_rgba(0,0,0,0.3)] flex overflow-hidden ring-1 ring-slate-200 dark:ring-slate-700">

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          <header className="px-8 h-[88px] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg border shadow-sm ${STAGE_CONFIG[project.stage].color}`}>
                {React.cloneElement(STAGE_CONFIG[project.stage].icon as any, { size: 18 })}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-none">{project.name}</h2>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span className="text-indigo-600 dark:text-indigo-400">{project.clientName}</span>
                  <span className="text-slate-200">/</span>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    {format(parseISO(project.overallDeadline), 'MMM d, yyyy')}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Phase 2A: Admin-only deadline and lead management */}
              {currentUser?.role === UserRole.ADMIN && (
                <>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900/20 text-slate-600 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900/40 transition-all border border-slate-200 dark:border-slate-800/50"
                    title="Edit Project"
                  >
                    <Edit3 size={14} />
                    Edit Project
                  </button>
                  <button
                    onClick={() => setShowDeadlineModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all border border-indigo-200 dark:border-indigo-800/50"
                    title="Change Deadline"
                  >
                    <Calendar size={14} />
                    Change Deadline
                  </button>
                  <button
                    onClick={() => setShowReassignModal(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all border border-emerald-200 dark:border-emerald-800/50"
                    title="Reassign Lead"
                  >
                    <UserPlus size={14} />
                    Reassign Lead
                  </button>
                </>
              )}

              {currentUser?.role === UserRole.ADMIN && (
                <button
                  onClick={handleDeleteProject}
                  className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                  title="Delete Project"
                >
                  <Trash2 size={18} />
                </button>
              )}



              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex gap-1 ring-1 ring-slate-200 dark:ring-slate-700">
                {[
                  { id: 'checklist', label: 'Tasks', icon: <CheckCircle size={14} /> },
                  { id: 'details', label: 'Brief', icon: <Edit3 size={14} /> },
                  { id: 'team', label: 'Team', icon: <UserIcon size={14} /> },
                  { id: 'history', label: 'History', icon: <History size={14} /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md flex items-center gap-2 transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'details' && (
              <div className="max-w-5xl mx-auto grid grid-cols-12 gap-8">
                <div className="col-span-12 space-y-6">
                  <div className="bg-[#F9FAFB] dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col min-h-[500px]">
                    <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between relative">
                      <div className="flex items-center gap-1 text-slate-400">
                        <button onClick={() => handleToolbarClick('bold')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" title="Bold"><Bold size={14} /></button>
                        <button onClick={() => handleToolbarClick('italic')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" title="Italic"><Italic size={14} /></button>
                        <button onClick={() => handleToolbarClick('list')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors" title="List"><ListIcon size={14} /></button>
                        <button onClick={() => handleToolbarClick('link')} className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors ${showLinkInput ? 'bg-slate-100 dark:bg-slate-700 text-indigo-600' : ''}`} title="Link"><LinkIcon size={14} /></button>
                      </div>

                      {showLinkInput && (
                        <div className="absolute top-12 left-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg p-3 z-50 flex items-center gap-2 animate-saas-fade">
                          <input
                            type="text"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="paste link url..."
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[12px] w-48 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') applyLink();
                              if (e.key === 'Escape') cancelLink();
                            }}
                          />
                          <button onClick={applyLink} className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"><CheckCircle size={14} /></button>
                          <button onClick={cancelLink} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={14} /></button>
                        </div>
                      )}

                      <button onClick={handleSaveScope} disabled={isSaving} className={`text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 rounded-md transition-all ${isSaving ? 'bg-emerald-500 text-white' : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200'}`}>
                        {isSaving ? <CheckCircle size={12} /> : <Save size={12} />}
                        {isSaving ? 'Synced' : 'Save Brief'}
                      </button>
                    </div>
                    <div
                      ref={editorRef}
                      contentEditable
                      onInput={(e) => setEditScope(sanitizeScopeHtml(e.currentTarget.innerHTML))}
                      onClick={handleEditorClick}
                      onKeyUp={handleEditorKeyUp}
                      onPaste={handleEditorPaste}
                      className="w-full flex-1 p-8 text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium bg-transparent border-none focus:ring-0 focus:outline-none overflow-y-auto wysiwyg-editor prose dark:prose-invert max-w-none"
                      suppressContentEditableWarning={true}
                    />
                    <style>{`
                      .wysiwyg-editor ul { list-style-type: disc; padding-left: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; }
                      .wysiwyg-editor a { color: #4f46e5; text-decoration: underline; cursor: pointer; }
                      .wysiwyg-editor a:hover::after { content: ' (Ctrl+Click to open)'; font-size: 10px; opacity: 0.7; margin-left: 4px; }
                      .dark .wysiwyg-editor a { color: #818cf8; }
                    `}</style>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'checklist' && (
              <div className="max-w-3xl mx-auto space-y-8 pb-12">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-6 group/header">
                  <h3 className="text-[14px] font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400"><CheckCircle size={16} /></span>
                    {STAGE_CONFIG[project.stage]?.label ? `${STAGE_CONFIG[project.stage].label} CHECKLIST`.toUpperCase() : 'PHASE COMPLETION CHECKLIST'}
                  </h3>
                  <div className="flex items-center gap-4">
                    {currentUser?.role === UserRole.ADMIN && items.length > 0 && project.stage !== ProjectStage.UPCOMING && (
                      <button
                        onClick={handleDeleteAllTasks}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all rounded-lg"
                        title="Delete All Tasks"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    {project.stage !== ProjectStage.UPCOMING && (
                      <div className="flex flex-col items-end">
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white leading-none">{items.filter(i => i.completed).length} / {items.length}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Verified Actions</span>
                      </div>
                    )}
                  </div>
                </div>

                {project.stage !== ProjectStage.UPCOMING && (
                  <>
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div key={item.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all group ${item.completed ? 'bg-slate-50 dark:bg-slate-800/50 border-transparent' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                          <label className="flex items-center gap-4 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              disabled={!canModifyChecklist}
                              onChange={() => toggleChecklistItem(item.id)}
                              className="w-5 h-5 rounded border-2 border-slate-400 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-30 bg-transparent"
                            />
                            <span className={`text-[14px] font-medium leading-relaxed ${item.completed ? 'text-slate-500 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{item.label}</span>
                          </label>
                          {currentUser?.role === UserRole.ADMIN && (
                            <button
                              onClick={(e) => handleDeleteTask(e, item.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all rounded"
                              title="Delete task"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {currentUser?.role === UserRole.ADMIN && (
                      <form onSubmit={handleAddTask} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add custom task..."
                          value={newTaskText}
                          onChange={(e) => setNewTaskText(e.target.value)}
                          className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-[14px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="submit"
                          disabled={!newTaskText.trim()}
                          className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-lg hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 transition-colors text-[13px] font-bold"
                        >
                          Add Task
                        </button>
                      </form>
                    )}
                  </>
                )}

                <div className="pt-8 space-y-4">
                  {/* QA Rejection Button - Always available during QA stage */}
                  {project.stage === ProjectStage.QA && !isChecklistComplete && (
                    <button
                      onClick={async () => {
                        const confirmed = await showConfirm({
                          title: 'Reject Project',
                          message: 'Are you sure you want to reject this project and return it to Development? This will reset the QA checklist.',
                          confirmText: 'Reject & Return',
                          cancelText: 'Cancel',
                          variant: 'error'
                        });
                        if (confirmed) {
                          qaFeedbackMutation.mutate({ id: project.id, passed: false, version: project.version });
                        }
                      }}
                      className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold text-[13px] rounded-xl border-2 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center justify-center gap-2"
                    >
                      <AlertTriangle size={16} /> Reject & Return to Development
                    </button>
                  )}

                  {/* Advancement Buttons */}
                  {project.stage === ProjectStage.UPCOMING ? (
                    // Start Project Gate
                    <div className="space-y-6">
                      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-xl shadow-sm">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">Operations Lead</h4>
                        <div className="space-y-5">
                          {[
                            { role: UserRole.DESIGNER, label: 'Design Lead', assignedId: project.assignedDesignerId },
                            { role: UserRole.DEV_MANAGER, label: 'Dev Lead', assignedId: project.assignedDevManagerId },
                            { role: UserRole.QA_ENGINEER, label: 'QA Lead', assignedId: project.assignedQAId }
                          ].map(assign => {
                            const user = users.find(u => u.id === assign.assignedId);
                            return (
                              <div key={assign.role} className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{assign.label}</span>
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                  <img src={user?.avatar || `https://picsum.photos/seed/${assign.role}/32/32`} className={`w-6 h-6 rounded-md ${!user && 'opacity-20'}`} alt="" />
                                  <div className="flex-1">
                                    {currentUser?.role === UserRole.ADMIN ? (
                                      <select value={assign.assignedId || ""} onChange={(e) => handleAssignment(assign.role, e.target.value)} className="w-full text-[12px] font-bold bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-slate-900 dark:text-slate-100 dark:bg-slate-900">
                                        <option value="">Unassigned</option>
                                        {users.filter(u => u.role === assign.role).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                      </select>
                                    ) : <p className="text-[12px] font-bold text-slate-900 dark:text-slate-100">{user?.name || 'Awaiting selection'}</p>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {project.assignedDesignerId && project.assignedDevManagerId && project.assignedQAId ? (
                        <button
                       onClick={() => advanceStageMutation.mutate({ id: project.id, nextStage: ProjectStage.DESIGN, version: project.version })}
                          className="w-full py-4 bg-indigo-600 text-white font-bold text-[14px] rounded-xl shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                        >
                          Start Project <ChevronRight size={18} />
                        </button>
                      ) : (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-3 text-slate-400 grayscale">
                          <Clock size={16} />
                          <span className="text-[12px] font-bold uppercase tracking-widest">Assign all leads to start project</span>
                        </div>
                      )}
                    </div>
                  ) : isChecklistComplete ? (
                    project.stage === ProjectStage.QA ? (
                      <div className="flex gap-4">
                        <button
                          onClick={async () => {
                            const confirmed = await showConfirm({
                              title: 'Reject Project',
                              message: 'Are you sure you want to reject this project and return it to Development?',
                              confirmText: 'Reject & Return',
                              cancelText: 'Cancel',
                              variant: 'error'
                            });
                            if (confirmed) {
                              qaFeedbackMutation.mutate({ id: project.id, passed: false, version: project.version });
                            }
                          }}
                          className="flex-1 py-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-bold text-[14px] rounded-xl shadow-sm hover:bg-red-200 dark:hover:bg-red-900/50 transition-all flex items-center justify-center gap-3"
                        >
                          <AlertTriangle size={18} /> Reject & Return to Dev
                        </button>
                        <button
                          onClick={() => qaFeedbackMutation.mutate({ id: project.id, passed: true, version: project.version })}
                          className="flex-1 py-4 bg-emerald-600 text-white font-bold text-[14px] rounded-xl shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-3"
                        >
                          QA Pass & Advance <ChevronRight size={18} />
                        </button>
                      </div>
                    ) : (nextStage ? (
                      <button
                        onClick={() => advanceStageMutation.mutate({ id: project.id, nextStage: nextStage, version: project.version })}
                        className="w-full py-4 bg-indigo-600 text-white font-bold text-[14px] rounded-xl shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                      >
                        Move to {STAGE_CONFIG[nextStage].label} <ChevronRight size={18} />
                      </button>
                    ) : null)
                  ) : (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-3 text-slate-400 grayscale">
                      <Clock size={16} />
                      <span className="text-[12px] font-bold uppercase tracking-widest">Complete all tasks to escalate</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="max-w-2xl mx-auto space-y-6">
                {history.map((h, i) => (
                  <div key={i} className="flex gap-4 relative">
                    {i !== history.length - 1 && <div className="absolute left-3.5 top-8 bottom-0 w-px bg-slate-200 dark:bg-slate-700"></div>}
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 relative z-10">
                      <Clock size={12} className="text-slate-500 dark:text-slate-400" />
                    </div>
                    <div className="pb-8">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{format(parseISO(h.timestamp), 'MMM d, HH:mm')}</p>
                      <p className="text-[14px] font-bold text-slate-900 dark:text-slate-100">{h.action}</p>
                      <p className="text-[12px] font-medium text-slate-500 mt-1">Initiated by {users.find(u => u.id === h.userId)?.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'team' && (
              <TeamTab project={project} />
            )}
          </div>
        </div>

        {/* Sidebar Activity */}
        <div className="w-96 flex-shrink-0">
          <ProjectCommentsSidebar project={project} onClose={onClose} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}

      {showEditModal && <EditProjectModal project={project} onClose={() => setShowEditModal(false)} />}

      {/* Phase 2A Modals — must also be portaled to document.body to render above everything */}
      {showDeadlineModal && createPortal(
        <ChangeDeadlineModal
          project={project}
          onClose={() => setShowDeadlineModal(false)}
        />,
        document.body
      )}
      {showReassignModal && createPortal(
        <ReassignLeadModal
          project={project}
          users={users}
          onClose={() => setShowReassignModal(false)}
        />,
        document.body
      )}
    </>
  );
};
