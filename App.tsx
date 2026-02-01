import React, { useState, useEffect, useMemo } from 'react';
import { MacWindow } from './components/MacWindow';
import { Sidebar } from './components/Sidebar';
import { Heatmap } from './components/Heatmap';
import { InsightsPanel } from './components/InsightsPanel';
import { StatisticsPanel } from './components/StatisticsPanel';
import { GoalsPanel } from './components/GoalsPanel';
import { TimerPanel } from './components/TimerPanel';
import { StudyLog, ViewMode, HeatmapTheme, UserGoals } from './types';
import * as storage from './services/storageService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>(ViewMode.DASHBOARD);
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [goals, setGoals] = useState<UserGoals>({ weekly: 40, monthly: 160, yearly: 2000 });
  
  // Dashboard state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [hoursInput, setHoursInput] = useState<number | string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [heatmapTheme, setHeatmapTheme] = useState<HeatmapTheme>('green');
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('focusflow_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    // Load data on mount
    let loadedLogs = storage.getLogs();
    if (loadedLogs.length === 0) {
      loadedLogs = storage.seedData(); 
    }
    setLogs(loadedLogs);
    setGoals(storage.getGoals());
    
    // Check if today has a log to pre-fill
    const today = new Date().toISOString().split('T')[0];
    const todayLog = loadedLogs.find(l => l.date === today);
    if (todayLog) {
        setHoursInput(todayLog.hours);
        setNotesInput(todayLog.notes || '');
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('focusflow_theme', newMode ? 'dark' : 'light');
  };

  const handleUpdateGoals = (newGoals: UserGoals) => {
      setGoals(newGoals);
      storage.saveGoals(newGoals);
  };

  const saveLogEntry = (date: string, hours: number, notes?: string) => {
      // Logic to merge hours if log exists, or overwrite. 
      // The current storage logic overwrites. Let's keep it simple for now, but 
      // for timer it might be nice to ADD to existing.
      // However, storageService.saveLog overwrites. 
      // Let's modify logic here: get existing log, add hours.
      
      const existing = logs.find(l => l.date === date);
      let newHours = hours;
      let newNotes = notes || '';

      if (existing) {
          // If called from Dashboard form, we usually overwrite what's in the input.
          // If called from Timer, we probably want to ADD to the daily total.
          // BUT, to keep it consistent with the "Edit" flow of dashboard,
          // let's stick to the storageService behavior which is effectively "Upsert".
          
          // Wait, if I use the form, I see the current value.
          // If I use the timer, I should probably add to the today's total.
          // Let's check where this is called.
          
          // Actually, let's just use the storageService directly which replaces.
          // But for the Timer specific handler, I will fetch current and add.
      }
      
      const newLogs = storage.saveLog({
          date: date,
          hours: hours,
          notes: notes
      });
      setLogs(newLogs);
      
      // Update form inputs if we are viewing that date
      if (selectedDate === date) {
          setHoursInput(hours);
          setNotesInput(notes || '');
      }
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    const h = Number(hoursInput);
    if (isNaN(h) || h < 0 || h > 24) return;
    saveLogEntry(selectedDate, h, notesInput);
  };

  const handleTimerSave = (sessionHours: number, sessionNote?: string) => {
      const today = new Date().toISOString().split('T')[0];
      const existing = logs.find(l => l.date === today);
      
      const totalHours = (existing ? existing.hours : 0) + sessionHours;
      const mergedNotes = existing 
          ? (existing.notes ? existing.notes + '; ' + sessionNote : sessionNote)
          : sessionNote;

      saveLogEntry(today, totalHours, mergedNotes);
      alert(`Session logged! Total for today: ${totalHours.toFixed(1)} hrs`);
  };
  
  const handleDeleteLog = () => {
      const confirmed = window.confirm("Are you sure you want to delete this entry?");
      if (confirmed) {
          const newLogs = storage.deleteLog(selectedDate);
          setLogs(newLogs);
          setHoursInput('');
          setNotesInput('');
      }
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    const existing = logs.find(l => l.date === date);
    setHoursInput(existing ? existing.hours : '');
    setNotesInput(existing ? existing.notes || '' : '');
    
    // If not on Dashboard, switch to it to show the form
    if (currentView !== ViewMode.DASHBOARD) {
        setCurrentView(ViewMode.DASHBOARD);
    }
  };
  
  const handleEditLogFromStats = (date: string) => {
      handleDayClick(date);
      setCurrentView(ViewMode.DASHBOARD);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = e.target.value;
      setSelectedDate(date);
      const existing = logs.find(l => l.date === date);
      setHoursInput(existing ? existing.hours : '');
      setNotesInput(existing ? existing.notes || '' : '');
  };

  const currentYear = new Date().getFullYear();

  // Check if current selection has an existing log
  const activeLog = useMemo(() => logs.find(l => l.date === selectedDate), [logs, selectedDate]);

  // Stats calculation
  const totalHours = useMemo(() => logs.reduce((acc, curr) => acc + curr.hours, 0), [logs]);
  const averageDaily = useMemo(() => {
      if (logs.length === 0) return 0;
      return totalHours / logs.length;
  }, [logs, totalHours]);
  
  // Weekly Progress
  const currentWeeklyHours = useMemo(() => {
      const now = new Date();
      // Adjust to get Monday of current week
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
      
      const monday = new Date(now);
      monday.setDate(diff);
      monday.setHours(0,0,0,0);
      
      const nextMonday = new Date(monday);
      nextMonday.setDate(monday.getDate() + 7);
      
      return logs
        .filter(l => {
            const d = new Date(l.date);
            return d >= monday && d < nextMonday;
        })
        .reduce((acc, curr) => acc + curr.hours, 0);
  }, [logs]);

  // Monthly Progress
  const currentMonthlyHours = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return logs
      .filter(l => {
        const d = new Date(l.date);
        return d >= startOfMonth && d <= endOfMonth;
      })
      .reduce((acc, curr) => acc + curr.hours, 0);
  }, [logs]);

  // Yearly Progress
  const currentYearlyHours = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    return logs
      .filter(l => {
        const d = new Date(l.date);
        return d >= startOfYear;
      })
      .reduce((acc, curr) => acc + curr.hours, 0);
  }, [logs]);

  // Streak Calculation
  const streaks = useMemo(() => {
      if (logs.length === 0) return { current: 0, longest: 0 };
      
      // Get unique sorted dates where hours > 0
      const activeDates = Array.from(new Set(
        logs.filter(l => l.hours > 0).map(l => l.date)
      )).sort();
      
      if (activeDates.length === 0) return { current: 0, longest: 0 };

      // Timestamps for easier math
      const timestamps = activeDates.map(d => new Date(d).setHours(0,0,0,0));
      
      let longest = 1;
      let currentRun = 1;

      // Calculate longest
      for (let i = 1; i < timestamps.length; i++) {
          const diffDays = (timestamps[i] - timestamps[i-1]) / (1000 * 60 * 60 * 24);
          if (diffDays === 1) {
              currentRun++;
          } else {
              currentRun = 1;
          }
          if (currentRun > longest) longest = currentRun;
      }

      // Calculate current streak
      // Must include today or yesterday to be active
      const today = new Date().setHours(0,0,0,0);
      const yesterday = today - 86400000;
      const lastLogDate = timestamps[timestamps.length - 1];
      
      let current = 0;
      if (lastLogDate === today || lastLogDate === yesterday) {
          current = 1;
          for (let i = timestamps.length - 2; i >= 0; i--) {
              const diffDays = (timestamps[i+1] - timestamps[i]) / (1000 * 60 * 60 * 24);
              if (diffDays === 1) {
                  current++;
              } else {
                  break;
              }
          }
      }

      return { current, longest };
  }, [logs]);

  // Weekly chart data (last 7 days from today)
  const weeklyData = useMemo(() => {
    const end = new Date();
    const data = [];
    for (let i = 6; i >= 0; i--) {
      // Use getTime() to ensure compatible type for new Date constructor
      const d = new Date(end.getTime());
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const log = logs.find(l => l.date === ds);
      data.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        hours: log ? log.hours : 0
      });
    }
    return data;
  }, [logs]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 transition-colors duration-500">
      <MacWindow isDarkMode={isDarkMode} onToggleTheme={toggleTheme}>
        <Sidebar 
            currentView={currentView} 
            onChangeView={setCurrentView} 
            weeklyGoal={goals.weekly}
            currentWeeklyHours={currentWeeklyHours}
        />
        
        <div className="flex-1 bg-white dark:bg-gray-900 relative overflow-hidden flex flex-col transition-colors duration-300">
          {currentView === ViewMode.DASHBOARD && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              <div className="p-8 pb-0">
                <header className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{currentYear} Activity</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Keep track of your learning journey.</p>
                  </div>
                  <div className="flex space-x-6 text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                     <div className="text-center px-2">
                        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Streak</p>
                        <p className="text-xl font-bold text-orange-500 dark:text-orange-400 flex items-center justify-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" /></svg>
                            {streaks.current}
                        </p>
                    </div>
                     <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
                     <div className="text-center px-2">
                        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Best</p>
                        <p className="text-xl font-bold text-yellow-500 dark:text-yellow-400">{streaks.longest}</p>
                    </div>
                     <div className="w-px bg-gray-200 dark:bg-gray-700"></div>
                    <div className="text-center px-2">
                        <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">Total</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white">{totalHours.toFixed(1)}h</p>
                    </div>
                  </div>
                </header>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-8 overflow-x-auto transition-colors duration-300 relative group">
                   <div className="absolute top-4 right-4 z-10 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       {(['green', 'blue', 'orange', 'purple'] as HeatmapTheme[]).map(t => (
                           <button 
                                key={t}
                                onClick={() => setHeatmapTheme(t)}
                                className={`w-4 h-4 rounded-full border border-white dark:border-gray-800 shadow-sm ${
                                    t === 'green' ? 'bg-green-500' : 
                                    t === 'blue' ? 'bg-blue-500' : 
                                    t === 'orange' ? 'bg-orange-500' : 'bg-purple-500'
                                } ${heatmapTheme === t ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                                title={`Set theme to ${t}`}
                           />
                       ))}
                   </div>
                   <Heatmap 
                      data={logs} 
                      year={currentYear} 
                      onDayClick={handleDayClick} 
                      isDarkMode={isDarkMode}
                      theme={heatmapTheme}
                   />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                    {/* Log Entry Form */}
                    <div className="lg:col-span-1 bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-800 dark:text-white">
                                {activeLog ? 'Edit Session' : 'Log Session'}
                            </h3>
                            {activeLog && (
                                <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full font-medium">
                                    Editing
                                </span>
                            )}
                        </div>
                        <form onSubmit={handleSaveLog} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Date</label>
                                <input 
                                    type="date" 
                                    value={selectedDate}
                                    onChange={handleDateChange}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm text-gray-900 dark:text-white dark:[color-scheme:dark]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Hours</label>
                                <div className="flex space-x-2">
                                    <input 
                                        type="number" 
                                        step="0.1" 
                                        min="0"
                                        max="24"
                                        value={hoursInput}
                                        onChange={(e) => setHoursInput(e.target.value)}
                                        placeholder="0.0"
                                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Notes</label>
                                <textarea
                                    value={notesInput}
                                    onChange={(e) => setNotesInput(e.target.value)}
                                    placeholder="What did you study?"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm text-gray-900 dark:text-white resize-none"
                                />
                            </div>
                            
                            <div className="flex space-x-2 pt-2">
                                <button 
                                    type="submit"
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        activeLog 
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                        : 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'
                                    }`}
                                >
                                    {activeLog ? 'Update Entry' : 'Save Entry'}
                                </button>
                                
                                {activeLog && (
                                    <button 
                                        type="button"
                                        onClick={handleDeleteLog}
                                        className="px-3 py-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                        title="Delete Entry"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Simple Weekly Chart */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Last 7 Days</h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#374151" : "#f3f4f6"} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: isDarkMode ? '#9ca3af' : '#9ca3af', fontSize: 12}} dy={10} />
                                    <YAxis hide />
                                    <Tooltip 
                                        cursor={{fill: isDarkMode ? '#1f2937' : '#f9fafb'}}
                                        contentStyle={{
                                            borderRadius: '8px', 
                                            border: 'none', 
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                            backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                                            color: isDarkMode ? '#fff' : '#000'
                                        }}
                                    />
                                    <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
              </div>
            </div>
          )}

          {currentView === ViewMode.TIMER && (
            <TimerPanel onSaveSession={handleTimerSave} />
          )}

          {currentView === ViewMode.STATISTICS && (
            <StatisticsPanel 
                logs={logs} 
                goals={goals} 
                onUpdateGoals={handleUpdateGoals}
                onEditLog={handleEditLogFromStats}
            />
          )}

          {currentView === ViewMode.GOALS && (
             <GoalsPanel 
                goals={goals} 
                onUpdateGoals={handleUpdateGoals}
                currentWeeklyHours={currentWeeklyHours}
                currentMonthlyHours={currentMonthlyHours}
                currentYearlyHours={currentYearlyHours}
             />
          )}

          {currentView === ViewMode.INSIGHTS && (
            <InsightsPanel logs={logs} />
          )}
        </div>
      </MacWindow>
    </div>
  );
}

export default App;