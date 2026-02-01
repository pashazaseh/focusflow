import React, { useState, useMemo } from 'react';
import { StudyLog, UserGoals } from '../types';
import { 
    BarChart, Bar, LineChart, Line, AreaChart, Area, 
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface StatisticsPanelProps {
  logs: StudyLog[];
  goals: UserGoals;
  onUpdateGoals: (goals: UserGoals) => void;
  onEditLog: (date: string) => void;
}

type SortField = 'date' | 'hours';
type FilterRange = 'all' | '7days' | '30days' | 'year';
type ChartType = 'bar' | 'line' | 'area';

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ logs, goals, onUpdateGoals, onEditLog }) => {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDesc, setSortDesc] = useState(true);
  const [filterRange, setFilterRange] = useState<FilterRange>('30days');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [goalInput, setGoalInput] = useState(goals.weekly.toString());
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  const handleGoalSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const val = parseInt(goalInput);
      if (!isNaN(val) && val > 0) {
          onUpdateGoals({ ...goals, weekly: val });
          setIsEditingGoal(false);
      }
  };

  const filteredLogs = useMemo(() => {
    let filtered = [...logs];
    const now = new Date();
    
    // Filter
    if (filterRange === '7days') {
        const cutoff = new Date(now);
        cutoff.setDate(now.getDate() - 7);
        filtered = filtered.filter(l => new Date(l.date) >= cutoff);
    } else if (filterRange === '30days') {
        const cutoff = new Date(now);
        cutoff.setDate(now.getDate() - 30);
        filtered = filtered.filter(l => new Date(l.date) >= cutoff);
    } else if (filterRange === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        filtered = filtered.filter(l => new Date(l.date) >= startOfYear);
    }

    // Sort for Table (User Interaction)
    filtered.sort((a, b) => {
        let valA = sortField === 'date' ? new Date(a.date).getTime() : a.hours;
        let valB = sortField === 'date' ? new Date(b.date).getTime() : b.hours;
        return sortDesc ? valB - valA : valA - valB;
    });

    return filtered;
  }, [logs, filterRange, sortField, sortDesc]);

  // Data prepared for charts (needs to be sorted chronologically)
  const chartData = useMemo(() => {
    const data = [...filteredLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return data.map(log => ({
        date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: log.hours
    }));
  }, [filteredLogs]);

  // Statistics Calculation
  const stats = useMemo(() => {
      const weekdays = filteredLogs.filter(l => {
          const day = new Date(l.date).getDay();
          return day !== 0 && day !== 6;
      });
      const weekends = filteredLogs.filter(l => {
          const day = new Date(l.date).getDay();
          return day === 0 || day === 6;
      });

      const avgWeekday = weekdays.length ? weekdays.reduce((a, b) => a + b.hours, 0) / weekdays.length : 0;
      const avgWeekend = weekends.length ? weekends.reduce((a, b) => a + b.hours, 0) / weekends.length : 0;
      const totalHours = filteredLogs.reduce((acc, curr) => acc + curr.hours, 0);
      const avgHours = filteredLogs.length > 0 ? totalHours / filteredLogs.length : 0;

      return { totalHours, avgHours, avgWeekday, avgWeekend };
  }, [filteredLogs]);

  const renderChart = () => {
    const commonProps = {
        data: chartData,
        margin: { top: 10, right: 10, left: -20, bottom: 0 }
    };

    if (chartType === 'line') {
        return (
            <LineChart {...commonProps}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
            </LineChart>
        );
    } else if (chartType === 'area') {
        return (
            <AreaChart {...commonProps}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="hours" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
            </AreaChart>
        );
    }
    return (
        <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
            <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} />
            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
            <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50/50 dark:bg-gray-900">
      <div className="p-8 h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Statistics</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Detailed breakdown of your study sessions.</p>
                </div>
                
                {/* Filter Controls */}
                <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    {(['all', 'year', '30days', '7days'] as FilterRange[]).map((range) => (
                        <button
                            key={range}
                            onClick={() => setFilterRange(range)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                filterRange === range 
                                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' 
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            {range === 'all' ? 'All' : range === 'year' ? 'Year' : range === '30days' ? '30d' : '7d'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Total Hours</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalHours.toFixed(1)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Daily Avg</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.avgHours.toFixed(1)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Weekday Avg</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.avgWeekday.toFixed(1)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Weekend Avg</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.avgWeekend.toFixed(1)}</p>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Activity Trend</h3>
                    <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                        <button onClick={() => setChartType('bar')} className={`p-1.5 rounded ${chartType === 'bar' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-400'}`}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
                        </button>
                        <button onClick={() => setChartType('line')} className={`p-1.5 rounded ${chartType === 'line' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-400'}`}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12.59l-2.3-2.3a1 1 0 011.42-1.42l4 4a1 1 0 010 1.42l-4 4a1 1 0 01-1.42-1.42l2.3-2.3H4a1 1 0 01-1-1z" clipRule="evenodd" /><path d="M13.5 6.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 10a2 2 0 100-4 2 2 0 000 4z" /></svg>
                            {/* Simple line icon substitute as heroicons doesn't have a clean chart-line one immediately available without import */}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        </button>
                        <button onClick={() => setChartType('area')} className={`p-1.5 rounded ${chartType === 'area' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-400'}`}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 3.414L15.172 6.586a2 2 0 01.586 1.414V15a2 2 0 01-2 2h-6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                             {/* Simple area icon substitute */}
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </button>
                    </div>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {renderChart()}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Log History</h3>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                            <th className="p-4 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => {
                                    if (sortField === 'date') setSortDesc(!sortDesc);
                                    else { setSortField('date'); setSortDesc(true); }
                                }}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Date</span>
                                    {sortField === 'date' && (
                                        <span>{sortDesc ? '↓' : '↑'}</span>
                                    )}
                                </div>
                            </th>
                            <th className="p-4 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                onClick={() => {
                                    if (sortField === 'hours') setSortDesc(!sortDesc);
                                    else { setSortField('hours'); setSortDesc(true); }
                                }}
                            >
                                <div className="flex items-center space-x-1">
                                    <span>Hours</span>
                                    {sortField === 'hours' && (
                                        <span>{sortDesc ? '↓' : '↑'}</span>
                                    )}
                                </div>
                            </th>
                            <th className="p-4 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Notes
                            </th>
                            <th className="p-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                    No logs found for this period.
                                </td>
                            </tr>
                        ) : (
                            filteredLogs.map((log) => (
                                <tr key={log.date} className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="p-4 text-sm text-gray-900 dark:text-gray-200 font-medium">
                                        {log.date}
                                        <div className="text-xs text-gray-400 font-normal">
                                            {new Date(log.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-900 dark:text-gray-200">
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                            log.hours >= 4 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                            log.hours >= 1 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                                            'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                        }`}>
                                            {log.hours} hrs
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                        {log.notes || <span className="text-gray-300 dark:text-gray-600 italic">-</span>}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => onEditLog(log.date)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all"
                                            title="Edit"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 00 2 2h11a2 2 0 00 2-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};
