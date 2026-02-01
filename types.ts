export interface StudyLog {
  date: string; // ISO string YYYY-MM-DD
  hours: number;
  notes?: string;
}

export interface DayStats {
  date: Date;
  dateStr: string;
  value: number;
  notes?: string;
}

export interface GeminiAnalysis {
  summary: string;
  strengths: string[];
  improvements: string[];
  tip: string;
}

export enum ViewMode {
  DASHBOARD = 'DASHBOARD',
  STATISTICS = 'STATISTICS',
  INSIGHTS = 'INSIGHTS',
  GOALS = 'GOALS',
  TIMER = 'TIMER',
  SETTINGS = 'SETTINGS'
}

export type HeatmapTheme = 'green' | 'blue' | 'orange' | 'purple';

export interface UserGoals {
  weekly: number;
  monthly: number;
  yearly: number;
}