import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getDateString, getHabits } from '../utils/habitStorage';
import { type Habit } from '../utils/types';
import BottomNav from '../components/BottomNav';
import { Colors } from '../utils/theme';

export default function AlertsScreen() {
  const router = useRouter();
  const [habitsWithReminders, setHabitsWithReminders] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const todayString = getDateString(new Date());

  const loadHabits = useCallback(async () => {
    setLoading(true);
    const all = await getHabits();
    const withReminders = all.filter(h => !!h.reminderTime);
    setHabitsWithReminders(withReminders);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHabits();
    }, [loadHabits])
  );

  const isCompletedToday = (habit: Habit): boolean =>
    habit.dailyCompletions?.[todayString] === true;

  const pendingHabits = habitsWithReminders.filter(h => !isCompletedToday(h));
  const completedHabits = habitsWithReminders.filter(h => isCompletedToday(h));

  const total = habitsWithReminders.length;
  const doneCount = completedHabits.length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reminders</Text>
        <View style={{ width: 60 }} />
      </View>

      {!loading && total > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <Text style={styles.summaryTitle}>Today's Progress</Text>
            <Text style={styles.summaryFraction}>{doneCount}/{total}</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${percent}%` as any, backgroundColor: Colors.accent }]} />
          </View>
          <Text style={styles.summaryPercent}>{percent}% completed</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : habitsWithReminders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No reminders set</Text>
            <Text style={styles.emptySubtitle}>Set a reminder time in habit settings to see it here.</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add-habit')}>
              <Text style={styles.addButtonText}>+ Add a Habit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {pendingHabits.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>⏰</Text>
                  <Text style={styles.sectionTitle}>Pending</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{pendingHabits.length}</Text>
                  </View>
                </View>
                {pendingHabits.map(habit => (
                  <TouchableOpacity
                    key={habit.id}
                    style={[styles.habitCard, styles.habitCardPending]}
                    onPress={() => router.push('/home')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.habitLeft}>
                      <Text style={styles.habitIcon}>{habit.icon}</Text>
                      <View style={styles.habitInfo}>
                        <Text style={styles.habitName}>{habit.name}</Text>
                        <Text style={styles.reminderTime}>🕐 {habit.reminderTime}</Text>
                        <Text style={styles.habitDifficulty}>{habit.difficulty}</Text>
                      </View>
                    </View>
                    <View style={styles.habitRight}>
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>Pending</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {completedHabits.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>✅</Text>
                  <Text style={styles.sectionTitle}>Completed</Text>
                  <View style={[styles.countBadge, styles.countBadgeDone]}>
                    <Text style={styles.countBadgeText}>{completedHabits.length}</Text>
                  </View>
                </View>
                {completedHabits.map(habit => (
                  <View key={habit.id} style={[styles.habitCard, styles.habitCardDone]}>
                    <View style={styles.habitLeft}>
                      <Text style={styles.habitIcon}>{habit.icon}</Text>
                      <View style={styles.habitInfo}>
                        <Text style={[styles.habitName, styles.habitNameDone]}>{habit.name}</Text>
                        <Text style={styles.reminderTime}>🕐 {habit.reminderTime}</Text>
                        <Text style={styles.habitDifficulty}>{habit.difficulty}</Text>
                      </View>
                    </View>
                    <View style={styles.doneBadge}>
                      <Text style={styles.doneBadgeText}>✓ Done</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary },
  backButton: { fontSize: 16, color: Colors.primary, fontWeight: '600', width: 60 },
  summaryCard: {
    marginHorizontal: 16, marginTop: 14, marginBottom: 4,
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  summaryFraction: { fontSize: 22, fontWeight: 'bold', color: Colors.textPrimary },
  progressBarBg: { height: 8, backgroundColor: Colors.surfaceSubtle, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressBarFill: { height: 8, borderRadius: 4 },
  summaryPercent: { fontSize: 12, color: Colors.textMuted, textAlign: 'right' },
  loadingText: { fontSize: 16, color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 24 },
  addButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  addButtonText: { color: Colors.background, fontWeight: 'bold', fontSize: 15 },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon: { fontSize: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  countBadge: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 24, alignItems: 'center' },
  countBadgeDone: { backgroundColor: Colors.secondary },
  countBadgeText: { fontSize: 11, color: Colors.background, fontWeight: 'bold' },
  habitCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  habitCardPending: { 
    borderLeftColor: '#E16A54', 
    backgroundColor: 'rgba(225, 106, 84, 0.08)' 
  },
  habitCardDone: { 
    borderLeftColor: '#A8B58E', 
    backgroundColor: 'rgba(168, 181, 142, 0.08)',
    opacity: 0.9 
  },
  habitLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  habitIcon: { fontSize: 28, marginRight: 12 },
  habitInfo: { flex: 1 },
  habitName: { fontSize: 15, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 3 },
  habitNameDone: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  reminderTime: { fontSize: 12, color: Colors.accent, marginBottom: 2 },
  habitDifficulty: { fontSize: 11, color: Colors.textMuted },
  habitRight: { alignItems: 'flex-end', gap: 6 },
  pendingBadge: { backgroundColor: Colors.surfaceSubtle, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  pendingBadgeText: { fontSize: 11, color: '#E16A54', fontWeight: 'bold' },
  doneBadge: { backgroundColor: Colors.surfaceSubtle, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  doneBadgeText: { fontSize: 11, color: '#A8B58E', fontWeight: 'bold' },
});