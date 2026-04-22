export interface DailyCompletion {
  [date: string]: boolean;
}

export interface SkipReason {
  [date: string]: string;
}

export interface Habit {
  id: string;
  _id?: string; // MongoDB ID compatibility
  name: string;
  icon: string;
  difficulty: string;
  streak: number;
  completed: boolean; 
  dailyCompletions: DailyCompletion;
  skipReasons?: SkipReason;
  reminderTime?: string;
  notes?: string;
  createdAt?: string;
}

export interface Session {
  id: string;
  _id?: string;
  taskName: string;
  duration: number;
  mode: 'stopwatch' | 'countdown';
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinDate?: string;
}
