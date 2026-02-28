import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../ThemeContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  Users,
  Trophy,
  LogOut,
  ChevronRight,
  Search,
  Archive,
  ClipboardList,
  Command,
  Settings,
  HelpCircle,
  Inbox,
  Moon,
  Sun,
  Layers,
  Newspaper,
  Menu,
  CheckCircle,
  X as CloseIcon
} from 'lucide-react';
import Dashboard from '../pages/Dashboard';
import TeamMembers from '../pages/TeamMembers';
import Leaderboard from '../pages/Leaderboard';
import CompletedProjects from '../pages/CompletedProjects';
import ProjectsOverview from '../pages/ProjectsOverview';
import Activity from '../pages/Activity';
import { DailyReportModal } from './DailyReportModal';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { CommandPalette } from './CommandPalette';
import { AddProjectModal } from './AddProjectModal';
import { SettingsModal } from './SettingsModal';
import { ProjectDetailModal } from './ProjectDetailModal';
import { Button } from './ui';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  isCollapsed?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, isActive, onClick, isCollapsed }) => (
  <button
    onClick={onClick}
    title={isCollapsed ? label : undefined}
    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2 rounded-lg transition-all duration-200 group ${isActive
      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.1)] dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-600'
      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
  >
    <div className={`${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors shrink-0`}>
      {React.cloneElement(icon as any, { size: 18, strokeWidth: isActive ? 2.5 : 2 })}
    </div>
    {!isCollapsed && <span className={`text-[13px] font-semibold tracking-tight whitespace-nowrap`}>{label}</span>}
    {isActive && !isCollapsed && <div className="ml-auto w-1 h-1 bg-indigo-600 rounded-full shrink-0" />}
  </button>
);

export const Layout: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  // const [currentView, setCurrentView] = useState<'dashboard' | 'overview' | 'team' | 'leaderboard' | 'completed' | 'activity'>('dashboard');
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const [showDailyReport, setShowDailyReport] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  // Auto-show daily briefing on first login
  useEffect(() => {
    const hasSeenBriefingToday = localStorage.getItem('briefing_' + new Date().toDateString());
    if (!hasSeenBriefingToday && currentUser) {
      setTimeout(() => setShowDailyReport(true), 1000);
      localStorage.setItem('briefing_' + new Date().toDateString(), 'true');
    }
  }, [currentUser]);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    [
      {
        key: '?',
        callback: () => setShowShortcutsHelp(true),
        description: 'Show keyboard shortcuts',
      },
      {
        key: 'b',
        callback: () => setShowDailyReport(true),
        description: 'Daily Briefing',
      },
      {
        key: 'k',
        metaKey: true,
        callback: () => setShowCommandPalette(true),
        description: 'Open command palette',
      },
      {
        key: 'k',
        ctrlKey: true,
        callback: () => setShowCommandPalette(true),
        description: 'Open command palette',
      },
    ],
    [
      {
        keys: ['g', 'd'],
        callback: () => navigate('/dashboard'),
        description: 'Go to Dashboard',
      },
      {
        keys: ['g', 'p'],
        callback: () => navigate('/projects'),
        description: 'Go to Pipeline',
      },
      {
        keys: ['g', 't'],
        callback: () => navigate('/team'),
        description: 'Go to Team',
      },
      {
        keys: ['g', 'l'],
        callback: () => navigate('/leaderboard'),
        description: 'Go to Leaderboard',
      },
      {
        keys: ['g', 'c'],
        callback: () => navigate('/archive'),
        description: 'Go to Completed Projects',
      },
    ]
  );

  /* Removed manual renderView switch */

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 overflow-hidden selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-900 dark:selection:text-indigo-100">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Pro Workspace Minimalist */}
      <aside className={`bg-[#F9FAFB] dark:bg-slate-800 border-r border-slate-200/60 dark:border-slate-700 flex flex-col fixed lg:relative h-full z-50 transition-all duration-300 ${desktopSidebarCollapsed ? 'w-20' : 'w-64'} ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5">
          <div className={`flex items-center gap-2.5 px-2 py-1.5 mb-8 ${desktopSidebarCollapsed ? 'justify-center relative' : ''}`}>
            <div className="w-8 h-8 shrink-0 bg-slate-900 dark:bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm ring-1 ring-white/20">N</div>
            {!desktopSidebarCollapsed && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <h1 className="font-bold text-[14px] leading-none text-slate-900 dark:text-slate-100 truncate">Nice Digitals</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">PM Tool</p>
              </div>
            )}
            {/* Desktop Collapse Toggle */}
            <button
              onClick={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
              className={`hidden lg:flex p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all ${desktopSidebarCollapsed ? 'absolute -right-3 top-6 translate-x-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm z-50 rounded-full' : 'ml-auto'}`}
              title={desktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {desktopSidebarCollapsed ? <ChevronRight size={14} /> : <div className="rotate-180"><ChevronRight size={14} /></div>}
            </button>
            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <CloseIcon size={20} />
            </button>
          </div>

          <div className="space-y-1">
            {!desktopSidebarCollapsed ? (
              <p className="text-[11px] font-bold text-slate-400 px-3 py-2 uppercase tracking-wider">Main</p>
            ) : (
              <div className="h-px w-6 bg-slate-200 dark:bg-slate-700 mx-auto mb-4 mt-2" />
            )}
            <SidebarItem
              icon={<LayoutDashboard />}
              label="Dashboard"
              isActive={currentPath === '/dashboard' || currentPath === '/'}
              onClick={() => navigate('/dashboard')}
              isCollapsed={desktopSidebarCollapsed}
            />
            <SidebarItem
              icon={<Layers />}
              label="Projects"
              isActive={currentPath === '/projects'}
              onClick={() => navigate('/projects')}
              isCollapsed={desktopSidebarCollapsed}
            />
            <SidebarItem
              icon={<Inbox />}
              label="Activity"
              isActive={currentPath === '/activity'}
              onClick={() => navigate('/activity')}
              isCollapsed={desktopSidebarCollapsed}
            />
          </div>

          <div className="mt-8 space-y-1">
            {!desktopSidebarCollapsed ? (
              <p className="text-[11px] font-bold text-slate-400 px-3 py-2 uppercase tracking-wider">Management</p>
            ) : (
              <div className="h-px w-6 bg-slate-200 dark:bg-slate-700 mx-auto mb-4 mt-2" />
            )}
            {currentUser?.role === UserRole.ADMIN && (
              <SidebarItem
                icon={<Users />}
                label="Team Members"
                isActive={currentPath === '/team'}
                onClick={() => navigate('/team')}
                isCollapsed={desktopSidebarCollapsed}
              />
            )}
            <SidebarItem
              icon={<Trophy />}
              label="Leaderboard"
              isActive={currentPath === '/leaderboard'}
              onClick={() => navigate('/leaderboard')}
              isCollapsed={desktopSidebarCollapsed}
            />
            <SidebarItem
              icon={<CheckCircle />}
              label="Completed Projects"
              isActive={currentPath === '/archive'}
              onClick={() => navigate('/archive')}
              isCollapsed={desktopSidebarCollapsed}
            />
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-slate-200/60 dark:border-slate-700">
          <div
            onClick={() => setShowSettings(true)}
            className={`flex items-center gap-3 ${desktopSidebarCollapsed ? 'justify-center px-0' : 'px-3'} py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group`}
            title={desktopSidebarCollapsed ? "Settings" : undefined}
          >
            <img src={currentUser?.avatar} className="w-8 h-8 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700 shrink-0" alt="User" />
            {!desktopSidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate leading-none">{currentUser?.name}</p>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">{(currentUser?.role || '').replace('_', ' ')}</p>
                </div>
                <Settings size={14} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors shrink-0" />
              </>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            fullWidth
            className={`mt-3 ${desktopSidebarCollapsed ? 'px-0 justify-center' : ''}`}
            title={desktopSidebarCollapsed ? (theme === 'light' ? 'Dark Mode' : 'Light Mode') : undefined}
          >
            {theme === 'light' ? <Moon size={14} className="shrink-0" /> : <Sun size={14} className="shrink-0" />}
            {!desktopSidebarCollapsed && (theme === 'light' ? 'Dark Mode' : 'Light Mode')}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
            }}
            fullWidth
            className={`mt-2 text-slate-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/20 ${desktopSidebarCollapsed ? 'px-0 justify-center' : ''}`}
            title={desktopSidebarCollapsed ? "Sign Out" : undefined}
          >
            <LogOut size={14} className="shrink-0" />
            {!desktopSidebarCollapsed && "Sign Out"}
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-slate-900">
        <header className="h-[72px] border-b border-slate-200/60 dark:border-slate-700 flex items-center px-4 sm:px-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
          {/* Left Section - Flex 1 */}
          <div className="flex-1 flex items-center">
            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors mr-2"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          </div>

          {/* Center Section - Flex 1 - Centered Content */}
          <div className="flex-1 flex justify-center">
            <div className="relative group w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                readOnly
                onClick={() => setShowCommandPalette(true)}
                onFocus={() => setShowCommandPalette(true)}
                placeholder="Search everything..."
                className="w-full pl-10 pr-12 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-transparent rounded-xl text-[13px] font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500/50 transition-all shadow-sm group-hover:bg-slate-100 dark:group-hover:bg-slate-800 cursor-pointer"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-black hidden sm:block shadow-sm pointer-events-none">Ctrl K</div>
            </div>
          </div>

          {/* Right Section - Flex 1 - Right Aligned Content */}
          <div className="flex-1 flex items-center justify-end gap-6">
            {/* Removed Role Switcher for Production */}
            {/* <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div> */}

            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowDailyReport(true)}
                className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                aria-label="Daily Briefing"
                title="Daily Briefing (B)"
              >
                <Newspaper size={19} />
              </button>
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                aria-label="Keyboard Shortcuts"
                title="Keyboard Shortcuts (?)"
              >
                <HelpCircle size={19} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
          <div className="max-w-[1400px] mx-auto animate-saas-fade">
            <Outlet context={{ onAddProject: () => setShowAddProjectModal(true) }} />
          </div>
        </div>
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showAddProjectModal && <AddProjectModal onClose={() => setShowAddProjectModal(false)} />}
      {showDailyReport && <DailyReportModal onClose={() => setShowDailyReport(false)} />}
      {showShortcutsHelp && <KeyboardShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />}
      {showCommandPalette && (
        <CommandPalette
          onClose={() => setShowCommandPalette(false)}
          onNavigate={(path) => navigate(path)}
          onOpenProject={(project) => {
            setSelectedProject(project);
            setShowCommandPalette(false);
          }}
          onNewProject={() => {
            setShowAddProjectModal(true);
            setShowCommandPalette(false);
          }}
        />
      )}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
};
