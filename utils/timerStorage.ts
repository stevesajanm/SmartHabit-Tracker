import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TimerSession {
  id: string;
  taskName: string;
  duration: number; // in seconds
  timestamp: string; // ISO string
}

const TIMER_STORAGE_KEY = '@timer_sessions';

export const saveTimerSession = async (session: Omit<TimerSession, 'id'>) => {
  try {
    const existing = await getTimerSessions();
    const newSession: TimerSession = {
      ...session,
      id: Date.now().toString(),
    };
    const updated = [newSession, ...existing];
    await AsyncStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(updated));
    return newSession;
  } catch (error) {
    console.error('Error saving timer session:', error);
    return null;
  }
};

export const getTimerSessions = async (): Promise<TimerSession[]> => {
  try {
    const data = await AsyncStorage.setItem(TIMER_STORAGE_KEY, []); // Initialize if empty
    // Wait, AsyncStorage.setItem is for saving. I meant getItem.
    const json = await AsyncStorage.getItem(TIMER_STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error('Error loading timer sessions:', error);
    return [];
  }
};

export const clearTimerSessions = async () => {
  try {
    await AsyncStorage.removeItem(TIMER_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing timer sessions:', error);
  }
};
