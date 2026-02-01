import React from 'react';
import { ViewMode } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
  weeklyGoal: number;
  currentWeeklyHours: number;
}

const NavItem = ({ 
  active, 
  onClick, 
  icon, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
      active 
        ? 'bg-blue-500 text-white shadow-md' 
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
    }`}
  >
    <div className={`${active ? 'text-white' : 'text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300'}`}>
      {icon}
    </div>
    <span className="font-medium text-sm">{label}</span>
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, weeklyGoal, currentWeeklyHours }) => {
  const progressPercent = Math.min(100, (currentWeeklyHours / weeklyGoal) * 100);

  return (
    <div className="w-64 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-md border-r border-gray-200 dark:border-gray-700 flex flex-col p-4 transition-colors duration-300">
      <div className="mb-8 px-2 mt-2">
        <h1 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight flex items-center space-x-2">
          <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>FocusFlow</span>
        </h1>
      </div>

      <nav className="flex-1 space-y-1">
        <NavItem
          active={currentView === ViewMode.DASHBOARD}
          onClick={() => onChangeView(ViewMode.DASHBOARD)}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
          label="Dashboard"
        />
        <NavItem
          active={currentView === ViewMode.TIMER}
          onClick={() => onChangeView(ViewMode.TIMER)}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Timer"
        />
        <NavItem
          active={currentView === ViewMode.STATISTICS}
          onClick={() => onChangeView(ViewMode.STATISTICS)}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 00 2 2h2a2 2 0 00 2-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 00 2 2h2a2 2 0 00 2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          label="Statistics"
        />
        <NavItem
          active={currentView === ViewMode.GOALS}
          onClick={() => onChangeView(ViewMode.GOALS)}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          label="Goals"
        />
        <NavItem
          active={currentView === ViewMode.INSIGHTS}
          onClick={() => onChangeView(ViewMode.INSIGHTS)}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
          label="AI Coach"
        />
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="bg-blue-50 dark:bg-gray-800 rounded-xl p-4 border border-blue-100 dark:border-gray-700 shadow-sm">
          <div className="flex justify-between items-end mb-2">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Weekly Goal</p>
              <p className="text-xs text-blue-500 dark:text-blue-400 text-right">{currentWeeklyHours.toFixed(1)} / {weeklyGoal} hrs</p>
          </div>
          <div className="w-full bg-blue-200 dark:bg-gray-700 rounded-full h-2 mb-1 overflow-hidden">
            <div 
                className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};