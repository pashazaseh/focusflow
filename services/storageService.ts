import { StudyLog, UserGoals } from '../types';

const STORAGE_KEY = 'focusflow_logs_v1';
const GOALS_KEY = 'focusflow_goals_v1';

export const getLogs = (): StudyLog[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to parse logs", e);
    return [];
  }
};

export const saveLog = (log: StudyLog): StudyLog[] => {
  const logs = getLogs();
  // Check if entry exists for this date
  const existingIndex = logs.findIndex(l => l.date === log.date);
  
  let newLogs;
  if (existingIndex >= 0) {
    newLogs = [...logs];
    newLogs[existingIndex] = log;
  } else {
    newLogs = [...logs, log];
  }
  
  // Sort logs by date
  newLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));
  return newLogs;
};

export const deleteLog = (date: string): StudyLog[] => {
  const logs = getLogs();
  const newLogs = logs.filter(l => l.date !== date);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newLogs));
  return newLogs;
};

export const getGoals = (): UserGoals => {
  try {
    const data = localStorage.getItem(GOALS_KEY);
    const parsed = data ? JSON.parse(data) : {};
    return {
      weekly: parsed.weekly || 40,
      monthly: parsed.monthly || 160,
      yearly: parsed.yearly || 2000
    };
  } catch (e) {
    return { weekly: 40, monthly: 160, yearly: 2000 };
  }
};

export const saveGoals = (goals: UserGoals): UserGoals => {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  return goals;
};

// Seed some data for visualization purposes if empty
export const seedData = (): StudyLog[] => {
  const logs: StudyLog[] = [];
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    
    // Simulate some randomness: 30% chance of 0 hours, else 1-8 hours
    if (Math.random() > 0.3) {
      logs.push({
        date: d.toISOString().split('T')[0],
        hours: Math.round((Math.random() * 6 + 1) * 10) / 10,
        notes: Math.random() > 0.8 ? "Focused study session" : undefined
      });
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  return logs;
};
