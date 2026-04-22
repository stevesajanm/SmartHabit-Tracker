import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Habit, type Session } from './types';

// Update this with your server's local IP or localhost for emulators
const API_URL = 'http://192.168.150.221:5000'; 

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('@jwt_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const fetchHabitsFromAPI = async (): Promise<Habit[]> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/habits`, { headers });
    if (!response.ok) throw new Error('Failed to fetch habits');
    const data = await response.json();
    
    // Convert MongoDB's _id to id for frontend compatibility
    return data.map((h: any) => ({ ...h, id: h._id }));
  } catch (error) {
    console.error('Error fetching habits from API:', error);
    throw error;
  }
};

export const addHabitToAPI = async (habitData: Partial<Habit>): Promise<Habit> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/habits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(habitData),
    });
    if (!response.ok) throw new Error('Failed to add habit');
    const newHabit = await response.json();
    return { ...newHabit, id: newHabit._id };
  } catch (error) {
    console.error('Error adding habit to API:', error);
    throw error;
  }
};

export const updateHabitInAPI = async (id: string, data: Partial<Habit>): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/habits/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update habit');
  } catch (error) {
    console.error('Error updating habit in API:', error);
    throw error;
  }
};

export const deleteHabitFromAPI = async (id: string): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/habits/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to delete habit');
  } catch (error) {
    console.error('Error deleting habit from API:', error);
    throw error;
  }
};

export const toggleHabitInAPI = async (id: string, date: Date): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    // Use local YYYY-MM-DD format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
                    
    const response = await fetch(`${API_URL}/api/habits/${id}/toggle`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ date: dateStr }),
    });
    if (!response.ok) throw new Error('Failed to toggle habit');
  } catch (error) {
    console.error('Error toggling habit in API:', error);
    throw error;
  }
};

export const saveSkipReasonToAPI = async (id: string, date: string, reason: string): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/habits/${id}/skip-reason`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ date, reason }),
    });
    if (!response.ok) throw new Error('Failed to save skip reason');
  } catch (error) {
    console.error('Error saving skip reason to API:', error);
    throw error;
  }
};

// ─── Timer Sessions ───────────────────────────────────────────

export const fetchSessionsFromAPI = async (): Promise<Session[]> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/sessions`, { headers });
    if (!response.ok) throw new Error('Failed to fetch sessions');
    const data = await response.json();
    return data.map((s: any) => ({ ...s, id: s._id }));
  } catch (error) {
    console.error('Error fetching sessions from API:', error);
    throw error;
  }
};

export const saveSessionToAPI = async (sessionData: Omit<Session, 'id' | '_id'>): Promise<Session> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(sessionData),
    });
    if (!response.ok) throw new Error('Failed to save session');
    const newSession = await response.json();
    return { ...newSession, id: newSession._id };
  } catch (error) {
    console.error('Error saving session to API:', error);
    throw error;
  }
};

// ─── Delete All User Data ─────────────────────────────────────
export const clearSessionsFromAPI = async (): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/sessions`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to clear sessions');
  } catch (error) {
    console.error('Error clearing sessions from API:', error);
    throw error;
  }
};

export const clearHabitsFromAPI = async (): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/habits`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) throw new Error('Failed to clear habits');
  } catch (error) {
    console.error('Error clearing habits from API:', error);
    throw error;
  }
};

// ─── Profile Update ───────────────────────────────────────────
export const updateProfileAPI = async (userData: { name?: string; email?: string; password?: string }): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/auth/profile`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(userData),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
    }
  } catch (error) {
    console.error('Error updating profile in API:', error);
    throw error;
  }
};
