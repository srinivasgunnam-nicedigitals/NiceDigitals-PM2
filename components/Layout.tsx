import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useApp } from '../store';
import { useTheme } from '../ThemeContext';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { UserRole } from '../types';
import {
  LayoutDashboard,
  Users,
  Trophy,
  LogOut,
  ChevronRight,
  Bell,
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
import { NotificationPanel } from './NotificationPanel';
import { Button } from './ui';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${isActive
      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.1)] dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-600'
      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
  >
    <div className={`${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>
      {React.cloneElement(icon as any, { size: 18, strokeWidth: isActive ? 2.5 : 2 })}
    </div>
    <span className={`text-[13px] font-semibold tracking-tight`}>{label}</span>
    {isActive && <div className="ml-auto w-1 h-1 bg-indigo-600 rounded-full" />}
  </button>
);

export const Layout: React.FC = () => {
  const { currentUser, setCurrentUser, users } = useApp();
  const { theme, toggleTheme } = useTheme();
  // const [currentView, setCurrentView] = useState<'dashboard' | 'overview' | 'team' | 'leaderboard' | 'completed' | 'activity'>('dashboard');
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, clearAllNotifications } = useApp();
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
        keys: ['g', 'a'],
        callback: () => navigate('/archive'),
        description: 'Go to Archive',
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
      <aside className={`w-64 bg-[#F9FAFB] dark:bg-slate-800 border-r border-slate-200/60 dark:border-slate-700 flex flex-col fixed lg:relative h-full z-50 transition-transform duration-300 ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5">
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-8">
            <div className="w-8 h-8 bg-slate-900 dark:bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm ring-1 ring-white/20">N</div>
            <div className="flex flex-col flex-1">
              <h1 className="font-bold text-[14px] leading-none text-slate-900 dark:text-slate-100">Nice Workspace</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Premium Plan</p>
            </div>
            {/* Mobile Close Button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <CloseIcon size={20} />
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold text-slate-400 px-3 py-2 uppercase tracking-wider">Main</p>
            <SidebarItem
              icon={<LayoutDashboard />}
              label="Dashboard"
              isActive={currentPath === '/dashboard' || currentPath === '/'}
              onClick={() => navigate('/dashboard')}
            />
            <SidebarItem
              icon={<Layers />}
              label="Projects"
              isActive={currentPath === '/projects'}
              onClick={() => navigate('/projects')}
            />
            <SidebarItem
              icon={<Inbox />}
              label="Activity"
              isActive={currentPath === '/activity'}
              onClick={() => navigate('/activity')}
            />
          </div>

          <div className="mt-8 space-y-1">
            <p className="text-[11px] font-bold text-slate-400 px-3 py-2 uppercase tracking-wider">Management</p>
            {currentUser?.role === UserRole.ADMIN && (
              <SidebarItem
                icon={<Users />}
                label="Team Roster"
                isActive={currentPath === '/team'}
                onClick={() => navigate('/team')}
              />
            )}
            <SidebarItem
              icon={<Trophy />}
              label="Leaderboard"
              isActive={currentPath === '/leaderboard'}
              onClick={() => navigate('/leaderboard')}
            />
            <SidebarItem
              icon={<Archive />}
              label="Archive"
              isActive={currentPath === '/archive'}
              onClick={() => navigate('/archive')}
            />
          </div>
        </div>

        <div className="mt-auto p-4 border-t border-slate-200/60 dark:border-slate-700">
          <div
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
          >
            <img src={currentUser?.avatar} className="w-8 h-8 rounded-lg ring-1 ring-slate-200 dark:ring-slate-700" alt="User" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate leading-none">{currentUser?.name}</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 truncate">{currentUser?.role.replace('_', ' ')}</p>
            </div>
            <Settings size={14} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            fullWidth
            className="mt-3"
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setCurrentUser(null);
              localStorage.removeItem('auth_token');
              navigate('/login');
            }}
            fullWidth
            className="mt-2 text-slate-500 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/20"
          >
            <LogOut size={14} />
            Sign Out
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
                placeholder="Search everything..."
                className="w-full pl-10 pr-12 py-2 bg-slate-100/50 dark:bg-slate-800/50 border border-transparent rounded-xl text-[13px] font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500/50 transition-all shadow-sm group-hover:bg-slate-100 dark:group-hover:bg-slate-800"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-black hidden sm:block shadow-sm">⌘K</div>
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
              <button
                onClick={() => setShowNotifications(true)}
                className="p-2.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all relative"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={19} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-indigo-600 rounded-full ring-2 ring-white dark:ring-slate-900"></span>
                )}
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

      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
          onMarkAsRead={markNotificationAsRead}
          onMarkAllAsRead={markAllNotificationsAsRead}
          onClearAll={clearAllNotifications}
        />
      )}
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
    </div>
  );
};
