import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchHabitsFromAPI, toggleHabitInAPI } from './apiService';
import { type Habit } from './types';

// ─── Get/Save local cache ─────────────────────────────────────
export const getHabits = async (): Promise<Habit[]> => {
  try {
    const data = await fetchHabitsFromAPI();
    await saveHabits(data);
    return data;
  } catch (error) {
    console.error('Error loading habits via getHabits fallback:', error);
    // Fallback to local cache if API fails
    const local = await AsyncStorage.getItem('@habits');
    return local ? JSON.parse(local) : [];
  }
};

export const saveHabits = async (habits: Habit[]): Promise<void> => {
  try {
    await AsyncStorage.setItem('@habits', JSON.stringify(habits));
  } catch (error) {
    console.error('Error saving habits to storage:', error);
  }
};

// ─── Date Helpers ───────────────────────────────────────────
export const getDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ─── Streak Calculation ──────────────────────────────────────
export const calculateStreak = (habit: Habit): number => {
  if (!habit.dailyCompletions) return 0;
  const today = new Date();
  const todayStr = getDateString(today);
  const isTodayDone = habit.dailyCompletions[todayStr] === true;
  const startOffset = isTodayDone ? 0 : 1;
  let streak = 0;
  for (let i = startOffset; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = getDateString(checkDate);
    if (habit.dailyCompletions[dateStr] === true) streak++;
    else break;
  }
  return streak;
};

export const calculateBestStreak = (habits: Habit[]): number => {
  if (!habits || habits.length === 0) return 0;
  return Math.max(...habits.map(h => calculateStreak(h)), 0);
};

// ─── Migration & Sync ────────────────────────────────────────
export const migrateHabitsToNewFormat = async (): Promise<void> => {
  // Placeholder for any data structure updates needed
};

// ─── Completion Helpers ─────────────────────────────────────
export const isHabitCompletedOnDate = (habit: Habit | undefined, date: Date): boolean => {
  if (!habit || !habit.dailyCompletions) return false;
  return habit.dailyCompletions[getDateString(date)] === true;
};

export const toggleHabitForDate = async (id: string, date: Date): Promise<void> => {
  try {
    await toggleHabitInAPI(id, date);
  } catch (error) {
    console.error('Error toggling habit:', error);
    throw error;
  }
};