
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../store';
import { Project, ProjectStage } from '../types';
import {
    Search,
    FolderOpen,
    LayoutDashboard,
    ClipboardList,
    Users,
    Trophy,
    Archive,
    Plus,
    ArrowRight,
    Clock
} from 'lucide-react';
import { STAGE_CONFIG } from '../constants';

interface CommandItem {
    id: string;
    type: 'project' | 'navigation' | 'action';
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    onSelect: () => void;
    keywords?: string[];
}

interface CommandPaletteProps {
    onClose: () => void;
    onNavigate: (view: string) => void;
    onOpenProject: (project: Project) => void;
    onNewProject: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
    onClose,
    onNavigate,
    onOpenProject,
    onNewProject
}) => {
    const { projects } = useApp();
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Build command items
    const allCommands: CommandItem[] = [
        // Navigation commands
        {
            id: 'nav-dashboard',
            type: 'navigation',
            title: 'Go to Dashboard',
            icon: <LayoutDashboard size={18} />,
            onSelect: () => { onNavigate('/dashboard'); onClose(); },
            keywords: ['dashboard', 'home', 'overview']
        },
        {
            id: 'nav-pipeline',
            type: 'navigation',
            title: 'Go to Pipeline',
            icon: <ClipboardList size={18} />,
            onSelect: () => { onNavigate('/projects'); onClose(); },
            keywords: ['pipeline', 'projects', 'overview']
        },
        {
            id: 'nav-team',
            type: 'navigation',
            title: 'Go to Team Roster',
            icon: <Users size={18} />,
            onSelect: () => { onNavigate('/team'); onClose(); },
            keywords: ['team', 'members', 'roster', 'people']
        },
        {
            id: 'nav-leaderboard',
            type: 'navigation',
            title: 'Go to Leaderboard',
            icon: <Trophy size={18} />,
            onSelect: () => { onNavigate('/leaderboard'); onClose(); },
            keywords: ['leaderboard', 'performance', 'rankings']
        },
        {
            id: 'nav-archive',
            type: 'navigation',
            title: 'Go to Archive',
            icon: <Archive size={18} />,
            onSelect: () => { onNavigate('/archive'); onClose(); },
            keywords: ['archive', 'completed', 'finished']
        },
        // Action commands
        {
            id: 'action-new-project',
            type: 'action',
            title: 'Create New Project',
            icon: <Plus size={18} />,
            onSelect: () => { onNewProject(); onClose(); },
            keywords: ['new', 'create', 'project', 'add']
        },
        // Project commands
        ...projects.filter(p => p.stage !== ProjectStage.COMPLETED).map(project => ({
            id: `project-${project.id}`,
            type: 'project' as const,
            title: project.name,
            subtitle: `${project.clientName} • ${STAGE_CONFIG[project.stage].label}`,
            icon: <FolderOpen size={18} />,
            onSelect: () => { onOpenProject(project); onClose(); },
            keywords: [project.name.toLowerCase(), project.clientName.toLowerCase(), STAGE_CONFIG[project.stage].label.toLowerCase()]
        }))
    ];

    // Fuzzy search function
    const fuzzyMatch = (str: string, pattern: string): boolean => {
        const lowerStr = str.toLowerCase();
        const lowerPattern = pattern.toLowerCase();

        // Exact match
        if (lowerStr.includes(lowerPattern)) return true;

        // Fuzzy match - all characters in pattern must appear in order
        let patternIndex = 0;
        for (let i = 0; i < lowerStr.length && patternIndex < lowerPattern.length; i++) {
            if (lowerStr[i] === lowerPattern[patternIndex]) {
                patternIndex++;
            }
        }
        return patternIndex === lowerPattern.length;
    };

    // Filter commands based on query
    const filteredCommands = query.trim() === ''
        ? allCommands.slice(0, 10) // Show first 10 when no query
        : allCommands.filter(cmd => {
            const searchText = `${cmd.title} ${cmd.subtitle || ''} ${cmd.keywords?.join(' ') || ''}`;
            return fuzzyMatch(searchText, query);
        }).slice(0, 8); // Limit to 8 results

    // Group commands by type
    const groupedCommands = filteredCommands.reduce((acc, cmd) => {
        if (!acc[cmd.type]) acc[cmd.type] = [];
        acc[cmd.type].push(cmd);
        return acc;
    }, {} as Record<string, CommandItem[]>);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredCommands[selectedIndex]) {
                    filteredCommands[selectedIndex].onSelect();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, filteredCommands, onClose]);

    // Reset selected index when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const typeLabels = {
        navigation: 'Navigation',
        action: 'Actions',
        project: 'Projects'
    };

    return (
        <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-start justify-center pt-[20vh] p-4 animate-saas-fade"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search projects, navigate, or run commands..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none text-base font-medium"
                    />
                    <kbd className="hidden sm:block px-2 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-xs font-bold text-slate-500 dark:text-slate-400">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto p-2">
                    {filteredCommands.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No results found</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try a different search term</p>
                        </div>
                    ) : (
                        Object.entries(groupedCommands).map(([type, commands]) => (
                            <div key={type} className="mb-4 last:mb-0">
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 py-2">
                                    {typeLabels[type as keyof typeof typeLabels]}
                                </p>
                                <div className="space-y-1">
                                    {commands.map((cmd, index) => {
                                        const globalIndex = filteredCommands.indexOf(cmd);
                                        const isSelected = globalIndex === selectedIndex;

                                        return (
                                            <button
                                                key={cmd.id}
                                                onClick={cmd.onSelect}
                                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${isSelected
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100'
                                                    }`}
                                            >
                                                <div className={`${isSelected ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                                    {cmd.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold truncate">{cmd.title}</p>
                                                    {cmd.subtitle && (
                                                        <p className={`text-xs truncate ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                                            {cmd.subtitle}
                                                        </p>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <ArrowRight size={16} className="text-white flex-shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-bold">↑↓</kbd>
                            Navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded font-bold">⏎</kbd>
                            Select
                        </span>
                    </div>
                    <span>{filteredCommands.length} results</span>
                </div>
            </div>
        </div>
    );
};
