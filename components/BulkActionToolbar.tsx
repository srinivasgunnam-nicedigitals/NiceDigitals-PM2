
import React from 'react';
import { ProjectStage, UserRole } from '../types';
import { X, Users as UsersIcon, Archive, Trash2, ArrowRight } from 'lucide-react';
import { STAGE_CONFIG } from '../constants';

interface BulkActionToolbarProps {
    selectedCount: number;
    onClearSelection: () => void;
    onBulkStageChange: (stage: ProjectStage) => void;
    onBulkAssign: (userId: string, role: 'designer' | 'dev' | 'qa') => void;
    onBulkArchive: () => void;
    onBulkDelete: () => void;
    users: any[];
    currentUser?: { role: string } | null;
}

export const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
    selectedCount,
    onClearSelection,
    onBulkStageChange,
    onBulkAssign,
    onBulkArchive,
    onBulkDelete,
    users,
    currentUser
}) => {
    const [showStageMenu, setShowStageMenu] = React.useState(false);
    const [showAssignMenu, setShowAssignMenu] = React.useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

    const designers = users.filter(u => u.role === UserRole.DESIGNER);
    const devManagers = users.filter(u => u.role === UserRole.DEV_MANAGER);
    const qaEngineers = users.filter(u => u.role === UserRole.QA_ENGINEER);

    const handleDelete = () => {
        onBulkDelete();
        setShowDeleteConfirm(false);
    };

    return (
        <>
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-saas-fade">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center gap-4">
                    {/* Selection Count */}
                    <div className="flex items-center gap-2 pr-4 border-r border-slate-200 dark:border-slate-700">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">{selectedCount}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {selectedCount === 1 ? 'project' : 'projects'} selected
                        </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Change Stage */}
                        {currentUser?.role === UserRole.ADMIN && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowStageMenu(!showStageMenu)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
                                >
                                    <ArrowRight size={16} />
                                    Change Stage
                                </button>
                                {showStageMenu && (
                                    <div className="absolute bottom-full mb-2 left-0 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-10">
                                        {Object.entries(STAGE_CONFIG).map(([stage, config]) => (
                                            <button
                                                key={stage}
                                                onClick={() => {
                                                    onBulkStageChange(stage as ProjectStage);
                                                    setShowStageMenu(false);
                                                }}
                                                className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                            >
                                                <span className={config.color}>{config.icon}</span>
                                                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{config.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Assign Team */}
                        <div className="relative">
                            <button
                                onClick={() => setShowAssignMenu(!showAssignMenu)}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
                            >
                                <UsersIcon size={16} />
                                Assign
                            </button>
                            {showAssignMenu && (
                                <div className="absolute bottom-full mb-2 left-0 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-10 max-h-80 overflow-y-auto">
                                    <div className="px-3 py-2">
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Designers</p>
                                    </div>
                                    {designers.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => {
                                                onBulkAssign(user.id, 'designer');
                                                setShowAssignMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                        >
                                            <img src={user.avatar} className="w-6 h-6 rounded-full" alt="" />
                                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</span>
                                        </button>
                                    ))}
                                    <div className="px-3 py-2 mt-2">
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Dev Managers</p>
                                    </div>
                                    {devManagers.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => {
                                                onBulkAssign(user.id, 'dev');
                                                setShowAssignMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                        >
                                            <img src={user.avatar} className="w-6 h-6 rounded-full" alt="" />
                                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</span>
                                        </button>
                                    ))}
                                    <div className="px-3 py-2 mt-2">
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">QA Engineers</p>
                                    </div>
                                    {qaEngineers.map(user => (
                                        <button
                                            key={user.id}
                                            onClick={() => {
                                                onBulkAssign(user.id, 'qa');
                                                setShowAssignMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                        >
                                            <img src={user.avatar} className="w-6 h-6 rounded-full" alt="" />
                                            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Archive */}
                        {currentUser?.role === UserRole.ADMIN && (
                            <button
                                onClick={onBulkArchive}
                                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
                            >
                                <Archive size={16} />
                                Archive
                            </button>
                        )}

                        {/* Delete */}
                        {currentUser?.role === UserRole.ADMIN && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap"
                            >
                                <Trash2 size={16} />
                                Delete
                            </button>
                        )}
                    </div>

                    {/* Clear Selection */}
                    <button
                        onClick={onClearSelection}
                        className="ml-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        title="Clear selection"
                    >
                        <X size={18} className="text-slate-400 dark:text-slate-500" />
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete Projects?</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                            Are you sure you want to delete {selectedCount} {selectedCount === 1 ? 'project' : 'projects'}?
                            All project data will be permanently removed.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
