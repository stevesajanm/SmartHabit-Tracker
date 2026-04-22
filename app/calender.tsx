import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getHabits, isHabitCompletedOnDate, migrateHabitsToNewFormat, toggleHabitForDate } from '../utils/habitStorage';
import { type Habit } from '../utils/types';
import BottomNav from '../components/BottomNav';
import { Colors } from '../utils/theme';

export default function CalendarScreen() {
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  // Days of the week
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get current day index (0 = Sunday, 6 = Saturday)
  const today = new Date().getDay();

  // ==================== LOAD HABITS ====================
  const loadHabits = useCallback(async () => {
    setLoading(true);
    await migrateHabitsToNewFormat();
    const loadedHabits = await getHabits();
    setHabits(loadedHabits);
    setLoading(false);
  }, []);

  // Load habits when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadHabits();
    }, [loadHabits])
  );

  // ==================== HANDLERS ====================
  const handleDayToggle = async (habitId: any, dayIndex: number) => {
    const todayDate = new Date();
    const currentDay = todayDate.getDay();
    const daysFromToday = dayIndex - currentDay;
    
    const targetDate = new Date(todayDate);
    targetDate.setDate(todayDate.getDate() + daysFromToday);
    
    await toggleHabitForDate(habitId, targetDate);
    await loadHabits();
  };

  const handleBackToHome = () => {
    router.back();
  };

  // ==================== RENDER ====================
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackToHome}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly Calendar</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Days Header */}
      <View style={styles.daysHeader}>
        <View style={styles.habitNameColumn}>
          <Text style={styles.habitHeaderText}>Habit</Text>
        </View>
        {daysOfWeek.map((day, index) => (
          <View
            key={day}
            style={[
              styles.dayColumn,
              index === today && styles.todayColumn,
            ]}
          >
            <Text
              style={[
                styles.dayHeaderText,
                index === today && styles.todayHeaderText,
                index > today && styles.futureDayHeaderText,
              ]}
            >
              {day}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={styles.loadingText}>Loading habits...</Text>
        ) : habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No habits yet!</Text>
            <Text style={styles.emptySubtitle}>Add a habit to start tracking</Text>
          </View>
        ) : (
          <View style={styles.habitsGrid}>
            {habits.map((habit) => (
              <View key={habit.id} style={styles.habitRow}>
                {/* Habit Name */}
                <View style={styles.habitNameColumn}>
                  <View style={styles.habitNameContent}>
                    <Text style={styles.habitIcon}>{habit.icon}</Text>
                    <View style={styles.habitTextContainer}>
                      <Text style={styles.habitName} numberOfLines={1}>
                        {habit.name}
                      </Text>
                      <Text style={styles.habitDifficulty}>{habit.difficulty}</Text>
                    </View>
                  </View>
                </View>

                {/* Day Checkboxes */}
                {daysOfWeek.map((_, dayIndex) => {
                  const todayDate = new Date();
                  const currentDay = todayDate.getDay();
                  const daysFromToday = dayIndex - currentDay;
                  
                  const targetDate = new Date(todayDate);
                  targetDate.setDate(todayDate.getDate() + daysFromToday);

                  const isFuture = dayIndex > today;
                  const isCompleted = isHabitCompletedOnDate(habit, targetDate);

                  return (
                    <TouchableOpacity
                      key={dayIndex}
                      style={[
                        styles.dayColumn,
                        dayIndex === today && styles.todayColumn,
                        isFuture && styles.futureDayColumn,
                      ]}
                      onPress={() => !isFuture && handleDayToggle(habit.id, dayIndex)}
                      disabled={isFuture}
                      activeOpacity={isFuture ? 1 : 0.7}
                    >
                      <View style={[
                        styles.checkbox,
                        isCompleted && styles.checkboxCompleted,
                        isFuture && styles.checkboxFuture,
                      ]}>
                        {isCompleted && (
                          <Text style={styles.checkMark}>✓</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  backButton: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  daysHeader: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  habitNameColumn: {
    width: 120,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  habitHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  todayColumn: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  todayHeaderText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  habitsGrid: {
    paddingHorizontal: 10,
  },
  habitRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 12,
  },
  habitNameContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  habitTextContainer: {
    flex: 1,
  },
  habitName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  habitDifficulty: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  futureDayColumn: {
    opacity: 0.35,
  },
  futureDayHeaderText: {
    color: Colors.border,
  },
  checkboxFuture: {
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceSubtle,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  checkMark: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});