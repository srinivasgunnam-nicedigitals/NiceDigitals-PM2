import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useLeaderboard } from '../hooks/useDashboard';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../ThemeContext';
import { getAvatarUrl } from '../utils/avatar';
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus, Users, Crown, Star, Zap } from 'lucide-react';

// ============================================================
// Leaderboard V3 — Role-Based Monthly Rankings
// ============================================================

const ROLE_TABS = [
  { key: 'designer', label: 'Designers', icon: <Star size={15} /> },
  { key: 'dev',      label: 'Dev Managers', icon: <Zap size={15} /> },
  { key: 'qa',       label: 'QA Engineers', icon: <Award size={15} /> },
] as const;

const MEDAL_STYLES = [
  { bg: 'bg-amber-100 dark:bg-amber-900/30', ring: 'ring-amber-400', text: 'text-amber-600 dark:text-amber-400', icon: <Crown size={14} className="text-amber-500" /> },
  { bg: 'bg-slate-100 dark:bg-slate-700/50', ring: 'ring-slate-400', text: 'text-slate-500 dark:text-slate-400', icon: <Medal size={14} className="text-slate-400" /> },
  { bg: 'bg-orange-100 dark:bg-orange-900/30', ring: 'ring-orange-400', text: 'text-orange-600 dark:text-orange-400', icon: <Medal size={14} className="text-orange-400" /> },
];

function Leaderboard() {
  const [activeTab, setActiveTab] = useState<string>('dev');
  const [filterMonth, setFilterMonth] = useState<number | undefined>();
  const [filterYear, setFilterYear] = useState<number | undefined>();
  const { currentUser } = useAuth();
  const { users } = useUsers();
  const { theme } = useTheme();
  const isAdmin = currentUser?.role === 'ADMIN';

  const { data, isLoading } = useLeaderboard(activeTab, filterMonth, filterYear);
  const entries = data?.entries || [];
  const displayMonth = data?.month || new Date().getMonth() + 1;
  const displayYear = data?.year || new Date().getFullYear();

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 px-8 py-6 shadow-sm">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30">
                <Trophy size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Leaderboard</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {monthNames[displayMonth - 1]} {displayYear}
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <select
                  value={filterMonth || ''}
                  onChange={(e) => setFilterMonth(e.target.value ? Number(e.target.value) : undefined)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  <option value="">Current Month</option>
                  {monthNames.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={filterYear || ''}
                  onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : undefined)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                >
                  <option value="">Current Year</option>
                  {[2024, 2025, 2026].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Role Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl gap-1">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-8 py-8">
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 mb-2" />
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                  </div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full mx-auto flex items-center justify-center mb-4">
              <Users size={28} className="text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">No Rankings Yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Rankings will appear here once projects start moving through the pipeline this month.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry: any, index: number) => {
              const medalStyle = MEDAL_STYLES[index] || null;
              const isTop3 = index < 3;
              const user = users.find((u) => u.id === entry.userId);

              return (
                <div
                  key={entry.userId}
                  className={`relative bg-white dark:bg-slate-800 rounded-xl border transition-all duration-200 hover:shadow-md ${
                    isTop3
                      ? 'border-transparent shadow-sm'
                      : 'border-slate-200 dark:border-slate-700'
                  } ${index === 0 ? 'ring-1 ring-amber-300/50 dark:ring-amber-500/30' : ''}`}
                >
                  <div className="flex items-center gap-4 p-5">
                    {/* Rank */}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                      medalStyle
                        ? `${medalStyle.bg} ${medalStyle.text}`
                        : 'bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500'
                    }`}>
                      {isTop3 ? medalStyle?.icon : `#${entry.rank}`}
                    </div>

                    {/* Avatar */}
                    <img
                      src={getAvatarUrl(user?.name || entry.userName, user?.avatar || entry.avatar)}
                      className={`w-11 h-11 rounded-full ring-2 ${
                        medalStyle ? medalStyle.ring : 'ring-slate-200 dark:ring-slate-600'
                      }`}
                      alt=""
                    />

                    {/* Name & Stats */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                        {entry.userName}
                        {index === 0 && <span className="ml-2 text-amber-500">👑</span>}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <TrendingUp size={11} />
                          {entry.successCount} wins
                        </span>
                        {entry.revertCount > 0 && (
                          <span className="text-[11px] text-red-500 dark:text-red-400 font-semibold flex items-center gap-1">
                            <TrendingDown size={11} />
                            {entry.revertCount} reverts
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <div className={`text-right ${entry.score >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      <span className="text-lg font-bold tracking-tight">
                        {entry.score > 0 ? '+' : ''}{entry.score}
                      </span>
                      <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Points</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
