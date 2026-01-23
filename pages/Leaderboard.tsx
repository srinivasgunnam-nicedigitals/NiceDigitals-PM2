
import React from 'react';
import { useApp } from '../store';
import { useTheme } from '../ThemeContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
  ComposedChart,
  Area
} from 'recharts';
import { Trophy, Target, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';

const Leaderboard = () => {
  const { getDevRankings } = useApp();
  const rankings = getDevRankings();

  const chartData = rankings.map(r => ({
    name: r.userName,
    QA: 100 - r.qaFailureRate,
    Delivery: r.onTimeDeliveryRate,
    Completed: r.completedProjects,
    Points: r.monthlyPoints
  }));

  const { theme } = useTheme();
  const axisColor = theme === 'dark' ? '#cbd5e1' : '#64748b';
  const gridColor = theme === 'dark' ? '#334155' : '#f1f5f9';

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h2 className="text-[24px] font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">Performance Leaderboard</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Monthly efficiency and quality rankings for Development Managers.</p>
      </div>

      {/* Graphical Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Efficiency vs. Quality</h3>
            <TrendingUp className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="name" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tick={{ fill: axisColor }} />
                <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} tick={{ fill: axisColor }} />
                <Tooltip
                  cursor={{ fill: theme === 'dark' ? '#334155' : '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: theme === 'dark' ? '#1e293b' : '#fff' }}
                  itemStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
                  labelStyle={{ color: theme === 'dark' ? '#cbd5e1' : '#64748b', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="QA" name="QA Pass Rate %" fill="#34d399" radius={[4, 4, 0, 0]} barSize={30} />
                <Line type="monotone" dataKey="Delivery" name="On-Time %" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
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

      {/* Tabular Data */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Performance Matrix</h3>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Ranking Cycle</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50">
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Manager</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">QA Pass Rate</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">On-Time %</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Completed</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Monthly Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rankings.map((rank, i) => (
              <tr key={rank.userId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <span className={`w-6 text-xs font-black ${i === 0 ? 'text-amber-500' : 'text-slate-300 dark:text-slate-500'}`}>#{i + 1}</span>
                    <img src={`https://picsum.photos/seed/${rank.userId}/40/40`} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600" alt="" />
                    <p className="font-bold text-slate-900 dark:text-slate-100">{rank.userName}</p>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${100 - rank.qaFailureRate}%` }}></div>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{Math.round(100 - rank.qaFailureRate)}%</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full" style={{ width: `${rank.onTimeDeliveryRate}%` }}></div>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{Math.round(rank.onTimeDeliveryRate)}%</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{rank.completedProjects} Projects</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-right">
                  <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-sm font-black">
                    {rank.monthlyPoints}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
