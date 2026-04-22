import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { type Habit } from './types';

// Configure notifications appearance
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Request Permission ─────────────────────────────────────
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('habit-reminders', {
        name: 'Habit Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6c63ff',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// ─── Helper to parse time string ────────────────────────────
// Handles formats like "08:30 AM", "8:30PM", or "20:00"
const parseReminderTime = (reminderTime: string): { hour: number; minute: number } | null => {
  try {
    if (!reminderTime) return null;
    // Regex matches HH:MM with optional space and AM/PM
    const match = reminderTime.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?$/);
    if (!match) return null;

    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const ampm = match[3]?.toUpperCase();

    if (ampm) {
      if (ampm === 'AM' && hour === 12) hour = 0;       // 12:xx AM → 0:xx
      if (ampm === 'PM' && hour !== 12) hour += 12;     // x:xx PM → x+12:xx
    }

    // Sanity check for 24-hour time range
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

    return { hour, minute };
  } catch {
    return null;
  }
};

// ─── Schedule Daily Reminders ────────────────────────────────
export const scheduleHabitNotification = async (habit: Habit): Promise<string | null> => {
  try {
    if (!habit.reminderTime) return null;

    const parsed = parseReminderTime(habit.reminderTime);
    if (!parsed) {
      console.warn(`Invalid reminder time format for habit ${habit.id}: ${habit.reminderTime}`);
      return null;
    }

    // First cancel any existing reminder for this specific habit
    await cancelHabitNotification(habit.id);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${habit.icon} Habit Reminder!`,
        body: `Time for your "${habit.name}" habit! 🔥`,
        sound: true,
        data: { habitId: habit.id },
        color: '#6c63ff',
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...Platform.select({
          android: {
            notificationChannelId: 'habit-reminders',
            channelId: 'habit-reminders',
          },
          default: {},
        }),
      } as any,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: parsed.hour,
        minute: parsed.minute,
        repeats: true,
      } as any,
    });

    console.log(`Reminder scheduled for "${habit.name}" at ${parsed.hour}:${parsed.minute} (ID: ${identifier})`);
    return identifier;
  } catch (error) {
    console.error(`Error scheduling notification for habit ${habit.id}:`, error);
    return null;
  }
};

export const scheduleAllHabitNotifications = async (habits: Habit[]): Promise<void> => {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.warn('Cannot schedule notifications: permission not granted');
      return;
    }

    // Optimization: Cancel all current habit notifications in one go
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.habitId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }

    for (const habit of habits) {
      if (habit.reminderTime) {
        await scheduleHabitNotification(habit);
      }
    }
    console.log(`Successfully processed reminders for ${habits.length} habits`);
  } catch (error) {
    console.error('Error scheduling all notifications:', error);
  }
};

// ─── Cancel Reminders ────────────────────────────────────────
export const cancelHabitNotification = async (habitId: string): Promise<void> => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = scheduled.filter(
      n => n.content.data?.habitId === habitId
    );

    for (const notification of toCancel) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  } catch (error) {
    console.error(`Error cancelling notification for habit ${habitId}:`, error);
  }
};

export const cancelAllHabitNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All scheduled notifications cleared');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
};