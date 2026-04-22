import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  deleteHabitFromAPI,
  fetchHabitsFromAPI,
  saveSkipReasonToAPI,
  toggleHabitInAPI,
} from "../utils/apiService";
import { Colors } from '../utils/theme';
import {
  calculateBestStreak,
  calculateStreak,
  getDateString,
  migrateHabitsToNewFormat,
} from "../utils/habitStorage";
import { type Habit } from "../utils/types";
import {
  cancelHabitNotification,
  requestNotificationPermission,
  scheduleAllHabitNotifications,
} from "../utils/notificationService";
import BottomNav from "../components/BottomNav";

// ─── Mood options for the failure/skip popup ──────────────────
const SKIP_REASONS = [
  { emoji: "😴", label: "Tired" },
  { emoji: "🏃", label: "Too Busy" },
  { emoji: "🤔", label: "Forgot" },
  { emoji: "😔", label: "Low Motivation" },
  { emoji: "🤒", label: "Sick" },
  { emoji: "⚡", label: "Other" },
];

// ─── Mindfulness quotes — changes daily ───────────────────────
const QUOTES = [
  { text: "The present moment is the only moment available to us.", author: "Thich Nhat Hanh" },
  { text: "Almost everything will work again if you unplug it for a few minutes.", author: "Anne Lamott" },
  { text: "Caring for yourself is not self-indulgence. It is self-preservation.", author: "Audre Lorde" },
  { text: "Rest is not idleness. It is the key to a better tomorrow.", author: "Unknown" },
  { text: "Be where you are, not where you think you should be.", author: "Unknown" },
  { text: "Small steps every day lead to big changes over time.", author: "Unknown" },
  { text: "Peace comes from within. Do not seek it without.", author: "Buddha" },
  { text: "Breathe. You are exactly where you need to be.", author: "Unknown" },
  { text: "Progress, not perfection, is the goal.", author: "Unknown" },
  { text: "Each morning we are born again. What we do today matters most.", author: "Buddha" },
  { text: "You are allowed to be both a masterpiece and a work in progress.", author: "Sophia Bush" },
  { text: "The quieter you become, the more you are able to hear.", author: "Rumi" },
  { text: "Self-care is how you take your power back.", author: "Lalah Delia" },
  { text: "Happiness is not something ready-made. It comes from your own actions.", author: "Dalai Lama" },
  { text: "The mind is everything. What you think, you become.", author: "Buddha" },
  { text: "Begin anywhere. Just begin.", author: "Unknown" },
  { text: "Be gentle with yourself. You are a child of the universe.", author: "Max Ehrmann" },
  { text: "One day at a time. One breath at a time.", author: "Unknown" },
  { text: "What you practice grows stronger.", author: "Shauna Shapiro" },
  { text: "Every moment is a fresh beginning.", author: "T.S. Eliot" },
];

const getDailyQuote = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return QUOTES[dayOfYear % QUOTES.length];
};

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name: string }>();
  const [displayName, setDisplayName] = useState<string>("there");
  const [habits, setHabits] = useState<Habit[]>([]);

  // ─── Failure popup state ─────────────────────────────────────
  const [showSkipPopup, setShowSkipPopup] = useState(false);
  const [skipHabit, setSkipHabit] = useState<Habit | null>(null);
  const [pendingMissedHabits, setPendingMissedHabits] = useState<Habit[]>([]);

  // ─── Calendar modal state ─────────────────────────────────────
  const todayString = getDateString(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    const loadName = async () => {
      const savedName = await AsyncStorage.getItem('@user_name');
      if (savedName) setDisplayName(savedName);
    };
    loadName();
  }, []);

  const loadHabits = async () => {
    await migrateHabitsToNewFormat();
    const loaded = await fetchHabitsFromAPI();
    setHabits(loaded);

    const notifEnabled = await AsyncStorage.getItem('@notifications_enabled');
    if (notifEnabled !== 'false') {
      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleAllHabitNotifications(loaded);
      }
    }

    const hour = new Date().getHours();
    const todayStr = getDateString(new Date());
    if (hour >= 20) {
      const missedWithNoReason = loaded.filter(h => {
        const isNotDone = !h.dailyCompletions?.[todayStr];
        const hasNoReason = !h.skipReasons?.[todayStr];
        return isNotDone && hasNoReason;
      });
      if (missedWithNoReason.length > 0) {
        const [first, ...rest] = missedWithNoReason;
        setPendingMissedHabits(rest);
        setSkipHabit(first);
        setShowSkipPopup(true);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHabits();
    }, [])
  );

  const handleToggle = async (id: any) => {
    const todayStr = getDateString(new Date());
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const wasCompleted = habit.dailyCompletions?.[todayStr] === true;

    try {
      await toggleHabitInAPI(id, new Date());
      await loadHabits();

      if (wasCompleted) {
        const updatedHabits = await fetchHabitsFromAPI();
        const updatedHabit = updatedHabits.find(h => h.id === id);
        if (updatedHabit) {
          setSkipHabit(updatedHabit);
          setShowSkipPopup(true);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle habit.');
    }
  };

  const handleSkipReason = async (reason: string) => {
    if (!skipHabit) return;
    const todayStr = getDateString(new Date());
    try {
      await saveSkipReasonToAPI(skipHabit.id, todayStr, reason);
      setShowSkipPopup(false);
      setSkipHabit(null);

      if (pendingMissedHabits.length > 0) {
        const [next, ...rest] = pendingMissedHabits;
        setPendingMissedHabits(rest);
        setSkipHabit(next);
        setShowSkipPopup(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save skip reason.');
    }
  };

  const handleSkipDismiss = () => {
    setShowSkipPopup(false);
    setSkipHabit(null);
    setPendingMissedHabits([]);
  };

  const handleLongPress = (habit: Habit) => {
    Alert.alert(habit.name, "What would you like to do?", [
      {
        text: "Edit",
        onPress: () =>
          router.push({
            pathname: "/add-habit",
            params: { habitId: habit.id },
          }),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => confirmDelete(habit),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const confirmDelete = (habit: Habit) => {
    Alert.alert("Delete Habit", `Are you sure matching "${habit.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteHabitFromAPI(habit.id);
            await loadHabits();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete habit.');
          }
        },
      },
    ]);
  };

  const isCompletedToday = (habit: Habit) => habit.dailyCompletions?.[todayString] === true;

  const todayCompleted = habits.filter(isCompletedToday).length;
  const todayTotal = habits.length;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const missedCount = habits.filter((h) => !isCompletedToday(h)).length;

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getCalendarDays = () => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const startPad = (firstDay === 0 ? 6 : firstDay - 1);
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const hasCompletionOnDate = (dateStr: string) => habits.some(h => h.dailyCompletions?.[dateStr] === true);
  const countCompletedOnDate = (dateStr: string) => habits.filter(h => h.dailyCompletions?.[dateStr] === true).length;

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  };

  const toDateStr = (day: number) => {
    const m = String(calMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${calYear}-${m}-${d}`;
  };

  const isFutureDay = (day: number) => {
    const date = new Date(calYear, calMonth, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  const dailyQuote = getDailyQuote();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const todayPercent = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{getGreeting()}, {displayName} 👋</Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.calendarBtn} onPress={() => setShowCalendar(true)}>
            <Text style={styles.calendarBtnText}>📅</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push("/add-habit")}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Daily Goal</Text>
          <Text style={styles.progressPercent}>{todayPercent}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${todayPercent}%` as any }]} />
        </View>
        <Text style={styles.progressSub}>
          {todayCompleted === todayTotal && todayTotal > 0 ? "Crushed it! 🚀" : `${todayTotal - todayCompleted} remaining`}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{todayCompleted}/{todayTotal}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{calculateBestStreak(habits)}</Text>
          <Text style={styles.statLabel}>Best</Text>
        </View>
      </View>

      <ScrollView style={styles.habitsList} showsVerticalScrollIndicator={false}>
        <View style={styles.quoteCard}>
          <Text style={styles.quoteIcon}>🧘</Text>
          <Text style={styles.quoteText}>"{dailyQuote.text}"</Text>
          <Text style={styles.quoteAuthor}>— {dailyQuote.author}</Text>
        </View>

        <Text style={styles.sectionTitle}>Today's Habits</Text>
        {habits.map((habit) => {
          const completed = isCompletedToday(habit);
          return (
            <TouchableOpacity key={habit.id} style={styles.habitCard} onPress={() => handleToggle(habit.id)} onLongPress={() => handleLongPress(habit)}>
              <Text style={styles.habitIcon}>{habit.icon}</Text>
              <View style={styles.habitInfo}>
                <Text style={styles.habitName}>{habit.name}</Text>
                <Text style={styles.habitDifficulty}>{habit.difficulty}</Text>
              </View>
              <View style={styles.habitRight}>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakText}>🔥 {calculateStreak(habit)}</Text>
                </View>
                <View style={[styles.checkbox, completed && styles.checkboxCompleted]}>
                  {completed && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav />

      <Modal visible={showSkipPopup} transparent animationType="slide">
        <View style={styles.popupOverlay}>
          <View style={styles.popupBox}>
            <Text style={styles.popupEmoji}>😔</Text>
            <Text style={styles.popupTitle}>Why skipped?</Text>
            <View style={styles.reasonsGrid}>
              {SKIP_REASONS.map((r) => (
                <TouchableOpacity key={r.label} style={styles.reasonBtn} onPress={() => handleSkipReason(r.label)}>
                  <Text style={styles.reasonEmoji}>{r.emoji}</Text>
                  <Text style={styles.reasonLabel}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.dismissBtn} onPress={handleSkipDismiss}>
              <Text style={styles.dismissText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCalendar} transparent animationType="slide">
        <View style={styles.calOverlay}>
          <View style={styles.calBox}>
            <View style={styles.calNavRow}>
              <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}><Text style={styles.calNavArrow}>‹</Text></TouchableOpacity>
              <View style={{alignItems:'center'}}><Text style={styles.calMonthText}>{MONTH_NAMES[calMonth]}</Text><Text style={styles.calYearText}>{calYear}</Text></View>
              <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}><Text style={styles.calNavArrow}>›</Text></TouchableOpacity>
            </View>
            <View style={styles.calGrid}>
              {getCalendarDays().map((day, i) => {
                if (!day) return <View key={i} style={styles.calCell} />;
                const dStr = toDateStr(day);
                const isToday = dStr === todayString;
                const isSelected = dStr === selectedDay;
                const future = isFutureDay(day);
                return (
                  <TouchableOpacity key={dStr} style={styles.calCell} onPress={() => !future && setSelectedDay(isSelected ? null : dStr)}>
                    <View style={[styles.calDayCircle, isToday && styles.calDayToday, isSelected && !isToday && styles.calDaySelected]}>
                      <Text style={[styles.calDayNum, isToday && styles.calDayNumToday, future && styles.calDayNumFuture]}>{day}</Text>
                    </View>
                    {hasCompletionOnDate(dStr) && <View style={styles.calDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.calCloseBtn} onPress={() => setShowCalendar(false)}><Text style={styles.calCloseBtnText}>CLOSE</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  calendarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
  },
  calendarBtnText: { fontSize: 20 },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center'
  },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  addBtnText: { color: Colors.background, fontSize: 24, fontWeight: 'bold', lineHeight: 28 },
  progressSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 5,
  },
  progressSub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 8,
  },
  greeting: { fontSize: 24, fontWeight: "bold", color: Colors.textPrimary },
  date: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: { fontSize: 22, fontWeight: "bold", color: Colors.primary },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  habitsList: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  quoteCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  quoteIcon: { fontSize: 20, marginBottom: 8 },
  quoteText: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontStyle: "italic",
    lineHeight: 22,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: "600",
    textAlign: "right",
  },
  habitCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  habitIcon: { fontSize: 28, marginRight: 12 },
  habitInfo: { flex: 1 },
  habitName: { fontSize: 16, fontWeight: "bold", color: Colors.textPrimary },
  habitDifficulty: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  habitRight: { alignItems: "center", gap: 8 },
  streakBadge: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  streakText: { fontSize: 12, color: Colors.accent },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxCompleted: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  checkmark: { color: Colors.background, fontSize: 14, fontWeight: "bold" },
  popupOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end", 
  },
  popupBox: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    alignItems: "center",
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  popupEmoji: { fontSize: 48, marginBottom: 8 },
  popupTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  popupSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  reasonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    width: "100%",
    marginBottom: 20,
  },
  reasonBtn: {
    width: "45%",
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reasonEmoji: { fontSize: 28, marginBottom: 6 },
  reasonLabel: { fontSize: 14, color: Colors.textPrimary, fontWeight: "600" },
  dismissBtn: { marginTop: 4, padding: 10 },
  dismissText: { fontSize: 14, color: Colors.textMuted },
  calOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  calBox: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calNavBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
  },
  calNavArrow: { fontSize: 24, color: Colors.primary, fontWeight: 'bold' },
  calMonthText: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary },
  calYearText: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayToday: { backgroundColor: Colors.primary },
  calDaySelected: { backgroundColor: Colors.surfaceSubtle },
  calDayNum: { fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  calDayNumToday: { color: Colors.background, fontWeight: 'bold' },
  calDayNumFuture: { color: Colors.border },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.secondary,
    marginTop: 2,
  },
  calCloseBtn: {
    width: '100%',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  calCloseBtnText: { color: Colors.textMuted, fontWeight: 'bold', fontSize: 14 },
});