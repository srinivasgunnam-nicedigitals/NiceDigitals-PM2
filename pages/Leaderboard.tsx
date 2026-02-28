
import React from 'react';
import { useDevRankings } from '../hooks/useDashboard';
import { useTheme } from '../ThemeContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Legend,
  ComposedChart,
} from 'recharts';
import { TrendingUp, CheckCircle, AlertTriangle, Minus } from 'lucide-react';

// Reusable N/A badge — shown when a metric has no underlying data
const NaBadge = () => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 text-xs font-bold">
    <Minus size={10} /> N/A
  </span>
);

const Leaderboard = () => {
  const { data: rankings = [] } = useDevRankings();

  // Only devs with actual project data appear in charts — prevents false 100% bars
  const activeRankings = rankings.filter(r => r.hasData);

  const chartData = activeRankings.map(r => ({
    name: r.userName,
    'First-Time Right %': r.qaFirstTimeRightRate ?? 0,
    'On-Time %': r.onTimeDeliveryRate ?? 0,
    Completed: r.completedProjects,
  }));

  const { theme } = useTheme();
  const axisColor = theme === 'dark' ? '#cbd5e1' : '#64748b';

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h2 className="text-[24px] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">Performance Leaderboard</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Monthly efficiency and quality rankings for Development Managers.</p>
      </div>

      {/* Graphical Comparison — only rendered when active devs exist */}
      {activeRankings.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Efficiency vs. Quality</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Only devs with assigned projects are included</p>
              </div>
              <TrendingUp className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="h-[300px] mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                  <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tick={{ fill: axisColor }} />
                  <YAxis domain={[0, 100]} fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tick={{ fill: axisColor }} />
                  <Tooltip
                    cursor={{ fill: theme === 'dark' ? '#334155' : '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff' }}
                    itemStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
                    labelStyle={{ color: theme === 'dark' ? '#cbd5e1' : '#64748b', fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value}%`]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="First-Time Right %" fill="#34d399" radius={[4, 4, 0, 0]} barSize={30} />
                  <Line type="monotone" dataKey="On-Time %" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Completed Projects (This Month)</h3>
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                  <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tick={{ fill: axisColor }} />
                  <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tick={{ fill: axisColor }} />
                  <Tooltip
                    cursor={{ fill: theme === 'dark' ? '#334155' : '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff' }}
                    itemStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
                    labelStyle={{ color: theme === 'dark' ? '#cbd5e1' : '#64748b', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="Completed" fill="#818cf8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center shadow-sm">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <p className="font-bold text-slate-700 dark:text-slate-300">No chart data available yet</p>
          <p className="text-sm text-slate-400 mt-1">Charts appear once Dev Managers have been assigned to at least one project.</p>
        </div>
      )}

      {/* Performance Matrix Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Performance Matrix</h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Ranking Cycle</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50">
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Manager</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">First-Time Right %</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">On-Time %</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Completed</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Monthly Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rankings.map((rank, i) => {
              const isInactive = !rank.hasData;
              // Rank number only counts active devs
              const activeRank = activeRankings.findIndex(r => r.userId === rank.userId);
              return (
                <tr key={rank.userId} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${isInactive ? 'opacity-50' : ''}`}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      {isInactive ? (
                        <span className="w-6 text-xs font-black text-slate-300 dark:text-slate-600">—</span>
                      ) : (
                        <span className={`w-6 text-xs font-black ${activeRank === 0 ? 'text-amber-500' : 'text-slate-300 dark:text-slate-500'}`}>
                          #{activeRank + 1}
                        </span>
                      )}
                      <img src={`https://picsum.photos/seed/${rank.userId}/40/40`} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600" alt="" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{rank.userName}</p>
                        {isInactive && (
                          <p className="text-[10px] text-slate-400 font-medium">No projects assigned yet</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    {rank.qaFirstTimeRightRate !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: `${rank.qaFirstTimeRightRate}%` }}></div>
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{rank.qaFirstTimeRightRate}%</span>
                      </div>
                    ) : <NaBadge />}
                  </td>
                  <td className="px-8 py-5">
                    {rank.onTimeDeliveryRate !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full" style={{ width: `${rank.onTimeDeliveryRate}%` }}></div>
                        </div>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{rank.onTimeDeliveryRate}%</span>
                      </div>
                    ) : <NaBadge />}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`w-4 h-4 ${rank.completedProjects > 0 ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'}`} />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{rank.completedProjects} Projects</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-sm font-black">
                      {rank.monthlyPoints}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
