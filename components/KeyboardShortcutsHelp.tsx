
import React, { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
    onClose: () => void;
}

const KeyBadge: React.FC<{ keys: string[] }> = ({ keys }) => {
    return (
        <div className="flex items-center gap-1">
            {keys.map((key, index) => (
                <React.Fragment key={index}>
                    <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold text-slate-700 dark:text-slate-300 shadow-sm min-w-[24px] text-center">
                        {key}
                    </kbd>
                    {index < keys.length - 1 && (
                        <span className="text-slate-400 text-xs font-bold">then</span>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ onClose }) => {
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

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-saas-fade">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <Keyboard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Keyboard Shortcuts</h2>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Navigate faster with keyboard</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-8">
                        {/* Navigation Shortcuts */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-1 h-4 bg-indigo-600 rounded"></span>
                                Navigation
                            </h3>
                            <div className="space-y-3">
                                {KEYBOARD_SHORTCUTS.navigation.map((shortcut, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            {shortcut.description}
                                        </span>
                                        <KeyBadge keys={shortcut.keys} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Shortcuts */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="w-1 h-4 bg-purple-600 rounded"></span>
                                Actions
                            </h3>
                            <div className="space-y-3">
                                {KEYBOARD_SHORTCUTS.actions.map((shortcut, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                            {shortcut.description}
                                        </span>
                                        <KeyBadge keys={shortcut.keys} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold">?</kbd> anytime to show this help
                    </p>
                </div>
            </div>
        </div>
    );
};
