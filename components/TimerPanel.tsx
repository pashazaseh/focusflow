import React, { useState, useEffect, useRef, useMemo } from 'react';

interface TimerPanelProps {
    onSaveSession: (hours: number, note?: string) => void;
}

interface CompletedSession {
    id: number;
    duration: number; // in seconds
    timestamp: Date;
    label: string;
    logged?: boolean;
}

type InputMode = 'PRESETS' | 'PICKER';
type TimerMode = 'TIMER' | 'STOPWATCH';

export const TimerPanel: React.FC<TimerPanelProps> = ({ onSaveSession }) => {
  // Mode State
  const [mode, setMode] = useState<TimerMode>('TIMER');

  // Timer State
  const [timeLeft, setTimeLeft] = useState(25 * 60); 
  const [initialTime, setInitialTime] = useState(25 * 60);
  const [stopwatchTime, setStopwatchTime] = useState(0);

  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Feature State
  const [taskLabel, setTaskLabel] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('focusflow_sound');
        return saved !== null ? saved === 'true' : true;
      }
      return true;
  });
  const [history, setHistory] = useState<CompletedSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('PRESETS');
  
  // Edit Modal State
  const [editingSession, setEditingSession] = useState<CompletedSession | null>(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editDuration, setEditDuration] = useState(0); // minutes
  const [editLabel, setEditLabel] = useState('');
  
  // Picker State
  const [pickerHours, setPickerHours] = useState(0);
  const [pickerMinutes, setPickerMinutes] = useState(25);
  const hoursScrollRef = useRef<HTMLDivElement>(null);
  const minutesScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  // Persist Sound Setting
  useEffect(() => {
      localStorage.setItem('focusflow_sound', String(soundEnabled));
  }, [soundEnabled]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (!isCompleted && !editingSession) {
             toggleTimer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isCompleted, editingSession]);

  // Timer/Stopwatch Tick
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (mode === 'TIMER') {
            if (timeLeft > 0) {
                setTimeLeft((prev) => prev - 1);
            } else {
                // Timer Finished
                finishSession();
            }
        } else {
            // Stopwatch Logic
            setStopwatchTime((prev) => prev + 1);
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft, mode]);

  // Sync Scroll Position with State
  useEffect(() => {
      if (inputMode === 'PICKER' && !isScrollingRef.current) {
          if (hoursScrollRef.current) {
              hoursScrollRef.current.scrollTop = pickerHours * 40;
          }
          if (minutesScrollRef.current) {
              minutesScrollRef.current.scrollTop = pickerMinutes * 40;
          }
      }
  }, [inputMode, pickerHours, pickerMinutes]);

  const switchMode = (newMode: TimerMode) => {
      setMode(newMode);
      setIsActive(false);
      setIsCompleted(false);
      if (newMode === 'TIMER') {
          setTimeLeft(initialTime);
      } else {
          setStopwatchTime(0);
      }
  };

  const toggleTimer = () => {
      setIsActive(prev => !prev);
      setIsCompleted(false);
  };

  const resetTimer = () => {
      setIsActive(false);
      setIsCompleted(false);
      if (mode === 'TIMER') {
        setTimeLeft(initialTime);
      } else {
        setStopwatchTime(0);
      }
  };

  const finishSession = () => {
      setIsActive(false);
      setIsCompleted(true);
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Only play sound for Timer completion, typically not Stopwatch
      if (mode === 'TIMER' && soundEnabled && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.log("Audio play failed", e));
      }

      const duration = mode === 'TIMER' ? initialTime : stopwatchTime;
      const newSession: CompletedSession = {
          id: Date.now(),
          duration: duration,
          timestamp: new Date(),
          label: taskLabel || (mode === 'TIMER' ? 'Focus Session' : 'Stopwatch Session'),
          logged: false
      };
      setHistory(prev => [newSession, ...prev]);
  };

  const setTime = (minutes: number) => {
      const seconds = Math.floor(minutes * 60);
      setInitialTime(seconds);
      setTimeLeft(seconds);
      setIsActive(false);
      setIsCompleted(false);
      
      setPickerHours(Math.floor(minutes / 60));
      setPickerMinutes(Math.floor(minutes % 60));
  };

  const formatTime = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      
      if (h > 0) {
          return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleLogSession = () => {
      const duration = mode === 'TIMER' ? initialTime : stopwatchTime;
      const hours = Math.round((duration / 3600) * 10) / 10;
      onSaveSession(hours, taskLabel || (mode === 'TIMER' ? 'Focus Session' : 'Stopwatch Session'));
      
      // Mark current session as logged if it exists in history (it should if finished)
      // Actually if we just finished, it's the first one.
      setHistory(prev => {
          if (prev.length > 0 && prev[0].duration === duration) {
              const newHist = [...prev];
              newHist[0].logged = true;
              return newHist;
          }
          return prev;
      });
      
      setIsCompleted(false);
      resetTimer();
  };

  // --- Edit Modal Logic ---
  const openEditModal = (session: CompletedSession) => {
      setEditingSession(session);
      
      // Format timestamps for datetime-local input
      // Use local time, so we need to account for timezone offset
      const toLocalISO = (date: Date) => {
          const d = new Date(date);
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          return d.toISOString().slice(0, 16);
      };

      const start = new Date(session.timestamp);
      // approximate end time based on duration
      const end = new Date(start.getTime() + session.duration * 1000);
      
      setEditStart(toLocalISO(start));
      setEditEnd(toLocalISO(end));
      setEditDuration(Math.round(session.duration / 60));
      setEditLabel(session.label);
  };

  const handleEditChange = (field: 'start' | 'end' | 'duration', value: string | number) => {
      if (field === 'start') {
          const newStart = new Date(value as string);
          setEditStart(value as string);
          // Update end time based on existing duration
          const newEnd = new Date(newStart.getTime() + editDuration * 60000);
           // Adjust for local iso string
          newEnd.setMinutes(newEnd.getMinutes() - newEnd.getTimezoneOffset());
          setEditEnd(newEnd.toISOString().slice(0, 16));
      } else if (field === 'end') {
          setEditEnd(value as string);
          const s = new Date(editStart);
          const e = new Date(value as string);
          const diffMins = Math.round((e.getTime() - s.getTime()) / 60000);
          setEditDuration(Math.max(0, diffMins));
      } else if (field === 'duration') {
          const mins = Number(value);
          setEditDuration(mins);
          const s = new Date(editStart);
          const newEnd = new Date(s.getTime() + mins * 60000);
          newEnd.setMinutes(newEnd.getMinutes() - newEnd.getTimezoneOffset());
          setEditEnd(newEnd.toISOString().slice(0, 16));
      }
  };

  const saveEdit = () => {
      if (!editingSession) return;
      
      setHistory(prev => prev.map(s => {
          if (s.id === editingSession.id) {
              return {
                  ...s,
                  timestamp: new Date(editStart),
                  duration: editDuration * 60,
                  label: editLabel
              };
          }
          return s;
      }));
      setEditingSession(null);
  };

  const deleteSession = () => {
      if (!editingSession) return;
      if (confirm('Are you sure you want to delete this session log?')) {
          setHistory(prev => prev.filter(s => s.id !== editingSession.id));
          setEditingSession(null);
      }
  };

  const logFromModal = () => {
      if (!editingSession) return;
      const hours = Math.round((editDuration / 60) * 10) / 10;
      onSaveSession(hours, editLabel);
      
      // Update history to logged
      setHistory(prev => prev.map(s => {
          if (s.id === editingSession.id) {
              return { ...s, logged: true, duration: editDuration * 60, label: editLabel };
          }
          return s;
      }));
      setEditingSession(null);
  };

  // --- Scroll Picker Logic ---
  const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'hours' | 'minutes') => {
      isScrollingRef.current = true;
      const target = e.currentTarget;
      const itemHeight = 40; // Height of each number item
      const value = Math.round(target.scrollTop / itemHeight);
      
      if (type === 'hours') {
          const h = Math.max(0, Math.min(23, value));
          if (h !== pickerHours) {
              setPickerHours(h);
              const totalSeconds = (h * 3600) + (pickerMinutes * 60);
              setInitialTime(totalSeconds);
              setTimeLeft(totalSeconds);
              setIsActive(false);
              setIsCompleted(false);
          }
      } else {
          const m = Math.max(0, Math.min(59, value));
          if (m !== pickerMinutes) {
              setPickerMinutes(m);
              const totalSeconds = (pickerHours * 3600) + (m * 60);
              setInitialTime(totalSeconds);
              setTimeLeft(totalSeconds);
              setIsActive(false);
              setIsCompleted(false);
          }
      }
      
      setTimeout(() => { isScrollingRef.current = false; }, 100);
  };

  // SVG Config
  const radius = 120;
  const cx = 150;
  const cy = 150;
  const circumference = 2 * Math.PI * radius;
  
  // Progress Logic
  let progress = 0;
  if (mode === 'TIMER') {
      progress = initialTime > 0 ? (initialTime - timeLeft) / initialTime : 0;
  } else {
      // For Stopwatch, fill the ring every minute (seconds visualization)
      progress = (stopwatchTime % 60) / 60;
      // If exactly 0, empty.
      if (stopwatchTime > 0 && stopwatchTime % 60 === 0) progress = 1;
  }
  
  const dashOffset = circumference * (1 - progress);

  // Generate ticks
  const ticks = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => {
        const angle = (i * 6 - 90) * (Math.PI / 180);
        const isMajor = i % 5 === 0;
        const tickLen = isMajor ? 10 : 5;
        const rStart = radius + 15;
        const rEnd = rStart + tickLen;
        const x1 = cx + rStart * Math.cos(angle);
        const y1 = cy + rStart * Math.sin(angle);
        const x2 = cx + rEnd * Math.cos(angle);
        const y2 = cy + rEnd * Math.sin(angle);
        
        return (
            <line 
                key={i} 
                x1={x1} y1={y1} x2={x2} y2={y2} 
                stroke="currentColor" 
                strokeWidth={isMajor ? 2 : 1}
                className={isMajor ? "text-gray-400 dark:text-gray-600" : "text-gray-300 dark:text-gray-800"}
            />
        );
    });
  }, [radius, cx, cy]);

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden transition-colors duration-300 bg-gray-50/30 dark:bg-black/20">
      
      {/* Scrollbar Utilities */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Header controls (Top Right Absolute) */}
      <div className="absolute top-6 right-6 z-20 flex items-center space-x-2">
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-full transition-all duration-200 ${
                soundEnabled 
                ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
              {soundEnabled ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
              ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
              )}
          </button>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-full transition-all duration-200 ${
                showHistory 
                ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 w-full">
        
            {/* Mode Switcher */}
            <div className="flex bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-full mb-8 backdrop-blur-sm z-10">
                <button 
                    onClick={() => switchMode('TIMER')}
                    className={`px-4 py-1 text-xs font-bold uppercase tracking-wider rounded-full transition-all ${mode === 'TIMER' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >Timer</button>
                <button 
                    onClick={() => switchMode('STOPWATCH')}
                    className={`px-4 py-1 text-xs font-bold uppercase tracking-wider rounded-full transition-all ${mode === 'STOPWATCH' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >Stopwatch</button>
            </div>

            {/* Futuristic Timer Ring with Content Inside */}
            <div className="relative mb-10 w-80 h-80 shrink-0 select-none">
                <svg className="w-full h-full" viewBox="0 0 300 300">
                    {/* Tick Marks */}
                    <g>{ticks}</g>

                    {/* Background Track */}
                    <circle cx={cx} cy={cy} r={radius} stroke="currentColor" strokeWidth="2" fill="transparent" className="text-gray-100 dark:text-gray-800" />
                    
                    {/* Active Progress */}
                    <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        stroke={isCompleted ? '#10b981' : '#3b82f6'}
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        transform={`rotate(-90 ${cx} ${cy})`}
                        className="transition-all duration-300 ease-linear drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    />
                </svg>
                
                {/* Center Content - Input, Time, Status */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                     {/* Task Input (Inside the clock) */}
                    <div className="w-48 mb-1">
                        <input
                            type="text"
                            value={taskLabel}
                            onChange={(e) => setTaskLabel(e.target.value)}
                            placeholder={mode === 'TIMER' ? "Session Objective" : "Stopwatch Task"}
                            className="w-full text-center bg-transparent py-1 text-sm font-medium tracking-wide text-gray-500 dark:text-gray-400 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:text-gray-800 dark:focus:text-white transition-all"
                            disabled={isActive || isCompleted}
                        />
                    </div>

                    <div className={`text-6xl font-mono font-bold tracking-tighter tabular-nums ${isCompleted ? 'text-green-500' : 'text-gray-900 dark:text-white'}`}>
                        {formatTime(mode === 'TIMER' ? timeLeft : stopwatchTime)}
                    </div>
                    
                    <div className={`mt-2 text-[10px] font-bold tracking-[0.2em] uppercase ${isActive ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`}>
                        {isActive ? (mode === 'TIMER' ? 'Counting Down' : 'Counting Up') : isCompleted ? 'Completed' : 'Standby'}
                    </div>
                </div>
            </div>

            {/* Main Controls - Centered & Compact */}
            <div className="flex items-center justify-center space-x-6 w-full mb-8 z-10">
                {!isCompleted ? (
                    <>
                         <button 
                            onClick={resetTimer}
                            disabled={isActive && mode === 'TIMER'} // Reset disabled while Timer running, enabled for Stopwatch
                            className="p-3 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Reset"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>

                        <button 
                            onClick={toggleTimer}
                            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-xl hover:shadow-2xl focus:outline-none active:scale-95 ${
                                isActive 
                                ? 'bg-amber-500/10 text-amber-500 border-2 border-amber-500/50 hover:bg-amber-500/20' 
                                : 'bg-blue-600 text-white hover:bg-blue-500 border-2 border-blue-500 shadow-blue-500/30'
                            }`}
                        >
                            {isActive ? (
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" /></svg>
                            ) : (
                                <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
                            )}
                        </button>

                        {/* Finish Button for Stopwatch (only when paused and has time) */}
                        {mode === 'STOPWATCH' && !isActive && stopwatchTime > 0 && (
                            <button 
                                onClick={finishSession}
                                className="p-3 rounded-full text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors animate-fade-in-left"
                                title="Finish & Log"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>
                        )}
                        
                        {/* Placeholder for layout balance if finish button not present */}
                        {!(mode === 'STOPWATCH' && !isActive && stopwatchTime > 0) && (
                            <div className="w-12 h-12"></div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center animate-fade-in-up">
                         <button 
                            onClick={handleLogSession}
                            className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transition-all transform active:scale-95 flex items-center"
                        >
                           <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                           Log Session
                        </button>
                        <button onClick={resetTimer} className="mt-4 text-sm font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                           Dismiss
                        </button>
                    </div>
                )}
            </div>

            {/* Mode Switcher - Sleek/Integrated (Only visible in Timer Mode) */}
            <div className={`w-full max-w-md transition-all duration-300 ${isActive || isCompleted || mode === 'STOPWATCH' ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100'}`}>
                
                {/* Mode Tabs */}
                <div className="flex justify-center mb-6">
                    <div className="bg-gray-200/50 dark:bg-gray-800/50 p-1 rounded-full inline-flex backdrop-blur-sm">
                        {(['PRESETS', 'PICKER'] as InputMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setInputMode(mode)}
                                className={`px-6 py-1.5 text-[10px] font-bold tracking-widest uppercase rounded-full transition-all ${
                                    inputMode === mode 
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                                    : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mode Content */}
                <div className="relative h-32 w-full overflow-hidden">
                    {/* PRESETS MODE */}
                    {inputMode === 'PRESETS' && (
                        <div className="animate-fade-in-up grid grid-cols-3 gap-3 px-4">
                            {[15, 25, 30, 45, 60, 90].map(mins => (
                                <button
                                    key={mins}
                                    onClick={() => setTime(mins)}
                                    className={`py-2 rounded-lg text-sm font-mono font-medium transition-all ${
                                        initialTime === mins * 60 
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                                        : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300 dark:hover:border-gray-600'
                                    }`}
                                >
                                    {mins}m
                                </button>
                            ))}
                        </div>
                    )}

                    {/* PICKER MODE */}
                    {inputMode === 'PICKER' && (
                        <div className="animate-fade-in-up flex justify-center items-center h-full relative overflow-hidden bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 mx-4">
                             {/* Gradients */}
                             <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white dark:from-gray-900 to-transparent z-10 pointer-events-none"></div>
                             <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white dark:from-gray-900 to-transparent z-10 pointer-events-none"></div>
                             {/* Selection Highlight */}
                             <div className="absolute w-full h-8 top-1/2 -translate-y-1/2 bg-blue-500/10 dark:bg-blue-500/20 z-0 border-y border-blue-500/20"></div>
                             
                             <div 
                                 ref={hoursScrollRef}
                                 onScroll={(e) => handleScroll(e, 'hours')}
                                 className="h-full w-20 overflow-y-auto no-scrollbar snap-y snap-mandatory py-[48px]"
                             >
                                 {Array.from({length: 24}).map((_, i) => (
                                     <div key={i} className={`h-8 flex items-center justify-center snap-center text-sm font-mono transition-all ${i === pickerHours ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-300 dark:text-gray-600'}`}>
                                         {i}
                                     </div>
                                 ))}
                             </div>
                             <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider pt-0.5 z-10">hr</span>
                             
                             <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-4 z-10"></div>
                             
                             <div 
                                 ref={minutesScrollRef}
                                 onScroll={(e) => handleScroll(e, 'minutes')}
                                 className="h-full w-20 overflow-y-auto no-scrollbar snap-y snap-mandatory py-[48px]"
                             >
                                 {Array.from({length: 60}).map((_, i) => (
                                     <div key={i} className={`h-8 flex items-center justify-center snap-center text-sm font-mono transition-all ${i === pickerMinutes ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-300 dark:text-gray-600'}`}>
                                         {i.toString().padStart(2, '0')}
                                     </div>
                                 ))}
                             </div>
                             <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider pt-0.5 z-10">min</span>
                        </div>
                    )}
                </div>
            </div>

      </div>

      {/* History Side Panel Overlay */}
      {showHistory && (
          <div className="absolute inset-y-0 right-0 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-l border-gray-200 dark:border-gray-700 p-0 z-40 flex flex-col shadow-2xl animate-fade-in-right">
              {/* History content */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <h3 className="text-gray-900 dark:text-white text-xs font-bold uppercase tracking-wider">Recent Sessions</h3>
                  <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {history.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                          <p className="text-xs">No sessions yet</p>
                      </div>
                  ) : (
                      <div className="space-y-3">
                          {history.map((session) => (
                              <div 
                                key={session.id} 
                                onClick={() => openEditModal(session)}
                                className="group p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer relative"
                              >
                                  <div className="flex justify-between items-start mb-1">
                                      <span className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate max-w-[140px]" title={session.label}>
                                          {session.label}
                                      </span>
                                      <div className="flex items-center space-x-2">
                                        {session.logged && (
                                            <span className="w-2 h-2 rounded-full bg-green-500" title="Logged to Dashboard"></span>
                                        )}
                                        <span className="text-green-600 dark:text-green-400 text-xs font-mono font-medium bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-md">
                                            {Math.round(session.duration / 60)}m
                                        </span>
                                      </div>
                                  </div>
                                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-50 dark:border-gray-700/50 text-[10px] text-gray-400 uppercase tracking-wide">
                                    <div>{session.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Edit Session Modal */}
      {editingSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                  <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                      <h3 className="text-white font-semibold flex items-center">
                          <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 00 2 2h11a2 2 0 00 2-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Edit Session
                      </h3>
                      <button onClick={() => setEditingSession(null)} className="text-gray-500 hover:text-white transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>
                  
                  <div className="p-5 space-y-6">
                      {/* Time Section */}
                      <div className="space-y-4">
                          <div className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              Time
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                              <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
                                  <label className="text-gray-400 text-sm">Start</label>
                                  <input 
                                    type="datetime-local" 
                                    value={editStart}
                                    onChange={(e) => handleEditChange('start', e.target.value)}
                                    className="bg-transparent text-white text-sm focus:outline-none text-right [color-scheme:dark]" 
                                  />
                              </div>
                              <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
                                  <label className="text-gray-400 text-sm">End</label>
                                  <input 
                                    type="datetime-local" 
                                    value={editEnd}
                                    onChange={(e) => handleEditChange('end', e.target.value)}
                                    className="bg-transparent text-white text-sm focus:outline-none text-right [color-scheme:dark]" 
                                  />
                              </div>
                              <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
                                  <label className="text-gray-400 text-sm">Duration (min)</label>
                                  <input 
                                    type="number" 
                                    min="1"
                                    value={editDuration}
                                    onChange={(e) => handleEditChange('duration', e.target.value)}
                                    className="bg-transparent text-white text-sm focus:outline-none text-right w-20" 
                                  />
                              </div>
                          </div>
                      </div>

                      {/* General Section */}
                      <div className="space-y-2">
                          <div className="flex items-center text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                              General
                          </div>
                          <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700/50">
                              <input 
                                type="text" 
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                placeholder="Timer Title..."
                                className="w-full bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
                              />
                          </div>
                      </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-4 bg-gray-800/50 border-t border-gray-800 flex flex-col gap-3">
                      {!editingSession.logged && (
                        <button 
                            onClick={logFromModal}
                            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors text-sm shadow-lg shadow-green-900/20"
                        >
                            Log to Dashboard
                        </button>
                      )}
                      
                      <div className="flex gap-3">
                        <button 
                            onClick={deleteSession}
                            className="flex-1 py-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 rounded-lg text-sm transition-colors"
                        >
                            Delete
                        </button>
                        <button 
                            onClick={saveEdit}
                            className="flex-1 py-2 bg-white text-black hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors"
                        >
                            Save Changes
                        </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}