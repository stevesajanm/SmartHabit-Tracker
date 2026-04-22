import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  calculateStreak,
  getDateString,
  getHabits,
} from '../utils/habitStorage';
import { type Habit } from '../utils/types';
import BottomNav from '../components/BottomNav';
import { Colors } from '../utils/theme';

const SCREEN_W = Dimensions.get('window').width;

const REASON_EMOJI: { [key: string]: string } = {
  Tired: '😴',
  'Too Busy': '🏃',
  Forgot: '🤔',
  'Low Motivation': '😔',
  Sick: '🤒',
  Other: '⚡',
};

const getDateRange = (startOffset: number, count: number): string[] => {
  const days: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - (startOffset + i));
    days.push(getDateString(d));
  }
  return days;
};

const THIS_WEEK = getDateRange(0, 7);
const LAST_WEEK = getDateRange(7, 7);
const LAST_30 = getDateRange(0, 30);

const shortDay = (ds: string) =>
  new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });

interface HabitInsight {
  habit: Habit;
  thisWeekDone: number;
  thisWeekPct: number;
  thisWeekStatuses: boolean[];
  lastWeekDone: number;
  lastWeekPct: number;
  thirtyDayDone: number;
  consistencyScore: number;
  reasonCounts: { [reason: string]: number };
  streak: number;
  bestStreak: number;
}

function getBestStreak(habit: Habit): number {
  const completions = habit.dailyCompletions || {};
  const doneDates = Object.entries(completions)
    .filter(([, v]) => v === true)
    .map(([k]) => k)
    .sort();
  if (!doneDates.length) return 0;
  let best = 1, current = 1;
  for (let i = 1; i < doneDates.length; i++) {
    const prev = new Date(doneDates[i - 1] + 'T00:00:00');
    const curr = new Date(doneDates[i] + 'T00:00:00');
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) { current++; if (current > best) best = current; }
    else current = 1;
  }
  return best;
}

function BarChart({
  bars,
  maxValue,
  barHeight = 110,
}: {
  bars: { label: string; value: number; color: string; dimmed?: boolean }[];
  maxValue: number;
  barHeight?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: barHeight + 36 }}>
      {bars.map((b, i) => {
        const fill = maxValue > 0 ? Math.max(b.value > 0 ? 6 : 0, (b.value / maxValue) * barHeight) : 0;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: barHeight + 36 }}>
            <Text style={[styles.barTopLabel, b.dimmed && { color: Colors.textMuted }]}>
              {b.value > 0 ? b.value : ''}
            </Text>
            <View style={{
              width: '62%',
              height: fill,
              backgroundColor: b.dimmed ? Colors.surfaceSubtle : b.color,
              borderRadius: 5,
              marginBottom: 6,
            }} />
            <Text style={[styles.barBottomLabel, b.dimmed && { color: Colors.textMuted }]}>{b.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function HorizBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={styles.horizBarBg}>
      <View style={[styles.horizBarFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: color }]} />
    </View>
  );
}

export default function InsightsScreen() {
  const router = useRouter();
  const [insights, setInsights] = useState<HabitInsight[]>([]);
  const [globalStats, setGlobalStats] = useState({
    thisWeekPct: 0,
    lastWeekPct: 0,
    totalThisWeek: 0,
    totalPossible: 0,
    avgConsistency: 0,
    topGlobalReason: null as string | null,
    globalReasonCounts: {} as { [r: string]: number },
  });

  const loadInsights = useCallback(async () => {
    const habits = await getHabits();
    if (!habits.length) return;

    const calculated: HabitInsight[] = habits.map(habit => {
      const thisWeekStatuses = THIS_WEEK.map(d => habit.dailyCompletions?.[d] === true);
      const thisWeekDone = thisWeekStatuses.filter(Boolean).length;
      const thisWeekPct = Math.round((thisWeekDone / 7) * 100);
      const lastWeekDone = LAST_WEEK.filter(d => habit.dailyCompletions?.[d] === true).length;
      const lastWeekPct = Math.round((lastWeekDone / 7) * 100);
      const thirtyDayDone = LAST_30.filter(d => habit.dailyCompletions?.[d] === true).length;
      const consistencyScore = Math.round((thirtyDayDone / 30) * 100);
      const reasonCounts: { [r: string]: number } = {};
      THIS_WEEK.forEach(d => {
        const r = habit.skipReasons?.[d];
        if (r) reasonCounts[r] = (reasonCounts[r] || 0) + 1;
      });

      return {
        habit,
        thisWeekDone,
        thisWeekPct,
        thisWeekStatuses,
        lastWeekDone,
        lastWeekPct,
        thirtyDayDone,
        consistencyScore,
        reasonCounts,
        streak: calculateStreak(habit),
        bestStreak: getBestStreak(habit),
      };
    });

    const totalPossible = habits.length * 7;
    const totalThisWeek = calculated.reduce((s, i) => s + i.thisWeekDone, 0);
    const totalLastWeek = calculated.reduce((s, i) => s + i.lastWeekDone, 0);
    const thisWeekPct = Math.round((totalThisWeek / totalPossible) * 100);
    const lastWeekPct = Math.round((totalLastWeek / totalPossible) * 100);
    const avgConsistency = Math.round(
      calculated.reduce((s, i) => s + i.consistencyScore, 0) / calculated.length
    );

    const globalReasonCounts: { [r: string]: number } = {};
    calculated.forEach(i => {
      Object.entries(i.reasonCounts).forEach(([r, c]) => {
        globalReasonCounts[r] = (globalReasonCounts[r] || 0) + c;
      });
    });
    let topGlobalReason: string | null = null;
    let topGlobalCount = 0;
    Object.entries(globalReasonCounts).forEach(([r, c]) => {
      if (c > topGlobalCount) { topGlobalReason = r; topGlobalCount = c; }
    });

    setGlobalStats({ thisWeekPct, lastWeekPct, totalThisWeek, totalPossible, avgConsistency, topGlobalReason, globalReasonCounts });
    calculated.sort((a, b) => a.consistencyScore - b.consistencyScore);
    setInsights(calculated);
  }, []);

  useFocusEffect(useCallback(() => { loadInsights(); }, [loadInsights]));

  const weekDelta = globalStats.thisWeekPct - globalStats.lastWeekPct;
  const hasReasons = Object.keys(globalStats.globalReasonCounts).length > 0;
  const maxReasonCount = hasReasons ? Math.max(...Object.values(globalStats.globalReasonCounts)) : 1;

  const dailyBars = THIS_WEEK.map(day => {
    const count = insights.filter(i => i.habit.dailyCompletions?.[day] === true).length;
    const isToday = day === getDateString(new Date());
    return {
      label: shortDay(day),
      value: count,
      color: isToday ? Colors.primary : Colors.secondary,
      dimmed: count === 0,
    };
  });
  const maxDaily = insights.length || 1;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Insights</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {insights.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>No data yet!</Text>
            <Text style={styles.emptySubtitle}>Track habits for a few days to unlock insights.</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionGap} />
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>THIS WEEK</Text>
                  <Text style={styles.summaryBigNumber}>{globalStats.thisWeekPct}%</Text>
                  <Text style={styles.summarySubtext}>
                    {globalStats.totalThisWeek} of {globalStats.totalPossible} habits completed
                  </Text>
                </View>
                <View style={[styles.trendBadge, { backgroundColor: weekDelta >= 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(233, 69, 96, 0.1)' }]}>
                  <Text style={[styles.trendArrow, { color: weekDelta >= 0 ? Colors.secondary : Colors.accent }]}>
                    {weekDelta >= 0 ? '▲' : '▼'}
                  </Text>
                  <Text style={[styles.trendValue, { color: weekDelta >= 0 ? Colors.secondary : Colors.accent }]}>
                    {Math.abs(weekDelta)}%
                  </Text>
                  <Text style={styles.trendVsLabel}>vs last week</Text>
                </View>
              </View>
              <View style={styles.summaryBarBg}>
                <View style={[styles.summaryBarFill, {
                  width: `${globalStats.thisWeekPct}%` as any,
                  backgroundColor: Colors.accent,
                }]} />
              </View>
              <View style={styles.summaryFooter}>
                <Text style={styles.summaryFooterText}>
                  📅 30-day avg consistency: <Text style={{ color: Colors.primary, fontWeight: '700' }}>{globalStats.avgConsistency}%</Text>
                </Text>
              </View>
            </View>

            <View style={styles.sectionGap} />
            <Text style={styles.sectionTitle}>📊 DAILY COMPLETIONS</Text>
            <View style={styles.card}>
              <BarChart bars={dailyBars} maxValue={maxDaily} barHeight={100} />
            </View>

            <View style={styles.sectionGap} />
            <Text style={styles.sectionTitle}>🎯 30-DAY CONSISTENCY</Text>
            <View style={styles.card}>
              {insights.map(item => (
                <View key={item.habit.id} style={styles.consistencyRow}>
                  <Text style={styles.consistencyIcon}>{item.habit.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={styles.consistencyTopRow}>
                      <Text style={styles.consistencyName} numberOfLines={1}>{item.habit.name}</Text>
                      <Text style={[styles.consistencyPct, { color: Colors.accent }]}>{item.consistencyScore}%</Text>
                    </View>
                    <View style={styles.consistencyBarBg}>
                      <View style={[styles.consistencyBarFill, { width: `${item.consistencyScore}%` as any, backgroundColor: Colors.accent }]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.sectionGap} />
            <Text style={styles.sectionTitle}>🔍 PER-HABIT BREAKDOWN</Text>
            {insights.map(item => (
              <View key={item.habit.id} style={styles.habitCard}>
                <View style={styles.habitCardHeader}>
                  <Text style={styles.habitCardIcon}>{item.habit.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.habitCardName}>{item.habit.name}</Text>
                    <Text style={styles.habitCardDiff}>{item.habit.difficulty}</Text>
                  </View>
                  <View style={styles.completionBadge}>
                    <Text style={styles.completionBadgeText}>{item.thisWeekDone}/7</Text>
                  </View>
                </View>
                <View style={styles.dotRow}>
                  {THIS_WEEK.map((day, idx) => (
                    <View key={day} style={styles.dotItem}>
                      <View style={[styles.dot, item.thisWeekStatuses[idx] ? styles.dotDone : styles.dotMissed, day === getDateString(new Date()) && styles.dotToday]} />
                      <Text style={styles.dotLabel}>{shortDay(day)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
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
  sectionGap: { height: 20 },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: Colors.primary,
    letterSpacing: 1.2, textTransform: 'uppercase',
    paddingHorizontal: 16, marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: 16,
    marginHorizontal: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
  summaryCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    marginHorizontal: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  summaryLabel: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 1, marginBottom: 4 },
  summaryBigNumber: { fontSize: 48, fontWeight: '800', color: Colors.textPrimary, lineHeight: 52 },
  summarySubtext: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  trendBadge: { borderRadius: 12, padding: 8, alignItems: 'center', minWidth: 80, marginLeft: 12 },
  trendArrow: { fontSize: 14, fontWeight: '800' },
  trendValue: { fontSize: 18, fontWeight: '800' },
  trendVsLabel: { fontSize: 9, color: Colors.textMuted },
  summaryBarBg: { height: 8, backgroundColor: Colors.surfaceSubtle, borderRadius: 4, overflow: 'hidden', marginBottom: 14 },
  summaryBarFill: { height: 8, borderRadius: 4 },
  summaryFooter: { gap: 4 },
  summaryFooterText: { fontSize: 12, color: Colors.textMuted },
  barTopLabel: { fontSize: 10, color: Colors.textMuted, marginBottom: 3, fontWeight: '600' },
  barBottomLabel: { fontSize: 10, color: Colors.textMuted },
  consistencyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  consistencyIcon: { fontSize: 24, width: 32 },
  consistencyTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  consistencyName: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, flex: 1 },
  consistencyPct: { fontSize: 13, fontWeight: '800' },
  consistencyBarBg: { height: 7, backgroundColor: Colors.surfaceSubtle, borderRadius: 4, overflow: 'hidden' },
  consistencyBarFill: { height: 7, borderRadius: 4 },
  horizBarBg: { height: 7, backgroundColor: Colors.surfaceSubtle, borderRadius: 4, overflow: 'hidden', marginTop: 5 },
  horizBarFill: { height: 7, borderRadius: 4 },
  habitCard: {
    backgroundColor: Colors.surface, borderRadius: 16,
    marginHorizontal: 16, marginBottom: 12, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  habitCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  habitCardIcon: { fontSize: 26, marginRight: 10 },
  habitCardName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  habitCardDiff: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  completionBadge: { backgroundColor: Colors.surfaceSubtle, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  completionBadgeText: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  dotRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dotItem: { alignItems: 'center', gap: 4 },
  dot: { width: 26, height: 26, borderRadius: 13 },
  dotDone: { backgroundColor: Colors.secondary },
  dotMissed: { backgroundColor: Colors.surfaceSubtle },
  dotToday: { borderWidth: 2, borderColor: Colors.primary },
  dotLabel: { fontSize: 9, color: Colors.textMuted },
});