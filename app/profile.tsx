import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert, Modal, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import {
  calculateBestStreak, calculateStreak,
  getDateString, getHabits, saveHabits,
} from '../utils/habitStorage';
import { type Habit } from '../utils/types';
import BottomNav from '../components/BottomNav';
import {
  cancelAllHabitNotifications,
  requestNotificationPermission,
  scheduleAllHabitNotifications,
} from '../utils/notificationService';
import {
  clearHabitsFromAPI,
  clearSessionsFromAPI,
  updateProfileAPI,
} from '../utils/apiService';
import { Colors } from '../utils/theme';

// ─── Constants ────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { emoji: '🔥', label: 'On Fire', condition: (s: number, _r: number) => s >= 7 },
  { emoji: '💎', label: 'Diamond', condition: (s: number, _r: number) => s >= 30 },
  { emoji: '⚡', label: 'Consistent', condition: (_s: number, r: number) => r >= 80 },
  { emoji: '🏆', label: 'Champion', condition: (s: number, _r: number) => s >= 14 },
  { emoji: '🌟', label: 'All-Star', condition: (_s: number, r: number) => r >= 95 },
];
const AVATARS = ['🧑', '👩', '👨', '🧙', '🦸', '🧑‍💻', '🧑‍🎨', '🧑‍🚀'];
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProfileScreen() {
  const router = useRouter();

  // ── Profile state ─────────────────────────────────────────
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('user@example.com');
  const [joinDate, setJoinDate] = useState('');
  const [avatar, setAvatar] = useState('🧑');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // ── Stats ─────────────────────────────────────────────────
  const [totalHabits, setTotalHabits] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [totalReflections, setTotalReflections] = useState(0);
  const [allHabits, setAllHabits] = useState<Habit[]>([]);

  // ── Modal visibility ──────────────────────────────────────
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // ── Edit Profile form state ───────────────────────────────
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editAvatar, setEditAvatar] = useState('🧑');
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Settings state ────────────────────────────────────────
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // ─── Load profile data ────────────────────────────────────
  const loadProfile = useCallback(async () => {
    try {
      const savedName = await AsyncStorage.getItem('@user_name');
      const savedEmail = await AsyncStorage.getItem('@user_email');
      const savedAvatar = await AsyncStorage.getItem('@user_avatar');
      const savedJoin = await AsyncStorage.getItem('@join_date');
      const savedNotif = await AsyncStorage.getItem('@notifications_enabled');

      if (savedName) { setUserName(savedName); setEditName(savedName); }
      if (savedEmail) { setUserEmail(savedEmail); setEditEmail(savedEmail); }
      if (savedAvatar) { setAvatar(savedAvatar); setEditAvatar(savedAvatar); }
      if (savedNotif) setNotificationsEnabled(savedNotif !== 'false');

      if (savedJoin) {
        setJoinDate(savedJoin);
      } else {
        const today = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        await AsyncStorage.setItem('@join_date', today);
        setJoinDate(today);
      }

      const habits = await getHabits();
      setAllHabits(habits);
      setTotalHabits(habits.length);
      setBestStreak(calculateBestStreak(habits));

      if (habits.length > 0) {
        const last7 = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - i);
          return getDateString(d);
        });
        const totalPossible = habits.length * 7;
        const totalDone = habits.reduce(
          (sum, h) => sum + last7.filter(d => h.dailyCompletions?.[d] === true).length, 0
        );
        setCompletionRate(totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0);
      }

      const reflections = habits.reduce(
        (sum, h) => sum + Object.keys(h.skipReasons || {}).length, 0
      );
      setTotalReflections(reflections);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));

  // ─── Save Edit Profile ────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }
    const updateData: any = { name: editName.trim(), email: editEmail.trim() };
    if (editPassword.trim().length > 0) {
      if (editPassword.trim().length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters.');
        return;
      }
      updateData.password = editPassword.trim();
    }
    setSavingProfile(true);
    try {
      await updateProfileAPI(updateData);
      await AsyncStorage.setItem('@user_name', editName.trim());
      await AsyncStorage.setItem('@user_email', editEmail.trim());
      await AsyncStorage.setItem('@user_avatar', editAvatar);
      setUserName(editName.trim());
      setUserEmail(editEmail.trim());
      setAvatar(editAvatar);
      setEditPassword('');
      setShowEditProfile(false);
      Alert.alert('✅ Saved', 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update on server.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ─── Settings handlers ────────────────────────────────────
  const handleNotificationToggle = async (val: boolean) => {
    setNotificationsEnabled(val);
    await AsyncStorage.setItem('@notifications_enabled', val ? 'true' : 'false');
    if (val) {
      const granted = await requestNotificationPermission();
      if (granted) await scheduleAllHabitNotifications(allHabits);
    } else {
      await cancelAllHabitNotifications();
    }
  };

  const handleClearData = () => {
    Alert.alert(
      '⚠️ Clear All Data',
      'This will permanently delete all habits, streaks and history from this email. Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything', style: 'destructive',
          onPress: async () => {
            try {
              await clearHabitsFromAPI();
              await clearSessionsFromAPI();
              await cancelAllHabitNotifications();
              await saveHabits([]);
              await AsyncStorage.multiRemove(['@habits', '@timer_sessions', '@user_avatar', '@join_date']);
              await loadProfile();
              setShowSettings(false);
              Alert.alert('✅ Done', 'All data cleared', [
                { text: 'OK', onPress: () => router.push('/home') },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data.');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await cancelAllHabitNotifications();
          await AsyncStorage.multiRemove([
            '@jwt_token', '@user_name', '@user_email', '@user_id',
            '@user_avatar', '@join_date', '@notifications_enabled',
            '@habits', '@timer_sessions'
          ]);
          router.replace('/login');
        },
      },
    ]);
  };

  // ─── Calculations ─────────────────────────────────────────
  const getDayOfWeekPattern = () => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const totals = [0, 0, 0, 0, 0, 0, 0];
    allHabits.forEach(h => {
      Object.entries(h.dailyCompletions || {}).forEach(([date, done]) => {
        const d = new Date(date + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          const dow = d.getDay();
          totals[dow]++;
          if (done) counts[dow]++;
        }
      });
    });
    return counts.map((c, i) => (totals[i] > 0 ? Math.round((c / totals[i]) * 100) : 0));
  };

  const getWorstHabit = () => {
    if (!allHabits.length) return null;
    let worst: Habit | null = null;
    let worstRate = 101;
    allHabits.forEach(h => {
      const entries = Object.values(h.dailyCompletions || {});
      if (entries.length === 0) return;
      const done = entries.filter(Boolean).length;
      const rate = Math.round((done / entries.length) * 100);
      if (rate < worstRate) { worstRate = rate; worst = h; }
    });
    if (!worst) return null;
    const h = worst as Habit;
    const entries = Object.values(h.dailyCompletions || {});
    const done = entries.filter(Boolean).length;
    const rate = Math.round((done / entries.length) * 100);
    const skips = Object.keys(h.skipReasons || {}).length;
    return { habit: h, rate, skips, totalDays: entries.length };
  };

  const getActiveDaysTotal = () => {
    const daySet = new Set<string>();
    allHabits.forEach(h => {
      Object.entries(h.dailyCompletions || {}).forEach(([date, done]) => {
        if (done) daySet.add(date);
      });
    });
    return daySet.size;
  };

  const unlockedIds = ACHIEVEMENTS
    .map((a, i) => a.condition(bestStreak, completionRate) ? i : -1)
    .filter(i => i >= 0);

  // ─── Render ───────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* User Profile Card */}
        <View style={styles.userCard}>
          <TouchableOpacity 
            style={styles.avatarWrapper} 
            onPress={() => setShowAvatarPicker(!showAvatarPicker)}
            activeOpacity={0.8}
          >
            <Text style={styles.avatarEmoji}>{avatar}</Text>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>tap to change</Text>
          {showAvatarPicker && (
            <View style={styles.avatarPicker}>
              {AVATARS.map(a => (
                <TouchableOpacity
                  key={a}
                  style={[styles.avatarOption, avatar === a && styles.avatarOptionSelected]}
                  onPress={async () => { setAvatar(a); setShowAvatarPicker(false); await AsyncStorage.setItem('@user_avatar', a); }}
                >
                  <Text style={styles.avatarOptionEmoji}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userEmail}>{userEmail}</Text>
          <View style={styles.joinBadge}>
            <Text style={styles.joinBadgeText}>📅 Member since {joinDate}</Text>
          </View>
        </View>

        {/* Stats Section */}
        <Text style={styles.sectionTitle}>Performance</Text>
        <View style={styles.statsGrid}>
          {[
            { value: totalHabits, label: 'Habits', icon: '📋' },
            { value: `${bestStreak}🔥`, label: 'Best Streak', icon: '🏆' },
            { value: `${completionRate}%`, label: 'Success', icon: '📈' },
            { value: totalReflections, label: 'Reflections', icon: '🧠' },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={stat.label === 'Success' ? {...styles.statLabel, color: Colors.primary} : styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Achievements Section */}
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.badgesRow}>
          {ACHIEVEMENTS.map((badge, i) => {
            const unlocked = unlockedIds.includes(i);
            return (
              <View key={i} style={styles.badgeWrapper}>
                <View style={[styles.badgeCircle, unlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
                  <Text style={[styles.badgeEmoji, !unlocked && { opacity: 0.2, filter: 'grayscale(1)' }]}>{badge.emoji}</Text>
                </View>
                <Text style={[styles.badgeLabel, !unlocked && { color: Colors.textMuted }]}>{badge.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Menu Section */}
        <Text style={styles.sectionTitle}>Utilities</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuRow} onPress={() => { setEditName(userName); setEditEmail(userEmail); setEditAvatar(avatar); setShowEditProfile(true); }}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>✏️</Text>
              <Text style={styles.menuLabel}>Edit Profile</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuRow} onPress={() => setShowDetailedStats(true)}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>📊</Text>
              <Text style={styles.menuLabel}>Detailed Statistics</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuRow} onPress={() => setShowSettings(true)}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>🔧</Text>
              <Text style={styles.menuLabel}>Settings</Text>
            </View>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav />

      {/* ───── MODAL: EDIT PROFILE ───── */}
      <Modal visible={showEditProfile} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}><Text style={{ color: Colors.textMuted, fontSize: 18 }}>✕</Text></TouchableOpacity>
            </View>
            <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName} placeholder="Name" placeholderTextColor={Colors.textMuted} />
            <TextInput style={styles.modalInput} value={editEmail} onChangeText={setEditEmail} placeholder="Email" placeholderTextColor={Colors.textMuted} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.modalInput} value={editPassword} onChangeText={setEditPassword} placeholder="New password (optional)" secureTextEntry placeholderTextColor={Colors.textMuted} />
            <TouchableOpacity style={styles.modalSave} onPress={handleSaveProfile} disabled={savingProfile}>
              <Text style={styles.modalSaveText}>{savingProfile ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ───── MODAL: DETAILED STATS ───── */}
      <Modal visible={showDetailedStats} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%', padding: 0 }]}>
            <View style={[styles.modalTop, { padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border }]}>
              <Text style={styles.modalTitle}>Detailed Stats</Text>
              <TouchableOpacity onPress={() => setShowDetailedStats(false)}><Text style={{ color: Colors.textMuted, fontSize: 18 }}>✕</Text></TouchableOpacity>
            </View>
            
            <ScrollView style={{ padding: 20 }}>
              <View style={styles.statsSummaryRow}>
                <View style={styles.summaryMiniCard}>
                  <Text style={styles.summaryValue}>{getActiveDaysTotal()}</Text>
                  <Text style={styles.summaryLabel}>Active Days</Text>
                </View>
                <View style={styles.summaryMiniCard}>
                  <Text style={styles.summaryValue}>
                    {allHabits.reduce((s, h) => s + Object.values(h.dailyCompletions || {}).filter(Boolean).length, 0)}
                  </Text>
                  <Text style={styles.summaryLabel}>Total Done</Text>
                </View>
              </View>

              <Text style={styles.statModalSubtitle}>Best Day Pattern</Text>
              {(() => {
                const rates = getDayOfWeekPattern();
                const max = Math.max(...rates, 1);
                return (
                  <View style={styles.heatmapRow}>
                    {DOW_LABELS.map((label, idx) => (
                      <View key={label} style={styles.heatCol}>
                        <View style={styles.heatBarBg}>
                          <View style={[styles.heatBarFill, { height: `${(rates[idx]/max)*100}%` }]} />
                        </View>
                        <Text style={styles.heatLabel}>{label[0]}</Text>
                        <Text style={styles.heatPct}>{rates[idx]}%</Text>
                      </View>
                    ))}
                  </View>
                );
              })()}

              <Text style={styles.statModalSubtitle}>Needs Attention</Text>
              {(() => {
                const worst = getWorstHabit();
                if (!worst) return <Text style={{ color: Colors.textMuted, textAlign: 'center' }}>No data yet</Text>;
                return (
                  <View style={styles.worstFocusCard}>
                    <Text style={{ fontSize: 32 }}>{worst.habit.icon}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: Colors.textPrimary, fontWeight: 'bold', fontSize: 16 }}>{worst.habit.name}</Text>
                      <Text style={{ color: Colors.primary, fontSize: 13 }}>{worst.rate}% completion rate</Text>
                      <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 4 }}>Tracked for {worst.totalDays} days</Text>
                    </View>
                  </View>
                );
              })()}

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ───── MODAL: SETTINGS ───── */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalTop}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}><Text style={{ color: Colors.textMuted, fontSize: 18 }}>✕</Text></TouchableOpacity>
            </View>
            <View style={styles.settingPrefRow}>
              <View>
                <Text style={{ color: Colors.textPrimary, fontWeight: '600' }}>Reminders</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12 }}>Daily habit alerts</Text>
              </View>
              <Switch value={notificationsEnabled} onValueChange={handleNotificationToggle} trackColor={{ true: Colors.primary }} />
            </View>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.dangerAction} onPress={handleClearData}>
              <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>Clear All History</Text>
            </TouchableOpacity>
            <View style={{ height: 10 }} />
            <Text style={{ textAlign: 'center', color: Colors.textMuted, fontSize: 11 }}>SmartHabit v1.0.0</Text>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary },
  backButton: { fontSize: 16, color: Colors.primary, fontWeight: '600' },
  
  userCard: { alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  avatarWrapper: { 
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', 
    borderWidth: 3, borderColor: Colors.accent, 
    elevation: 4, shadowColor: Colors.accent, shadowOpacity: 0.2, shadowRadius: 10 
  },
  avatarEmoji: { fontSize: 50 },
  avatarHint: { fontSize: 10, color: Colors.primary, marginTop: 8, fontWeight: 'bold', textTransform: 'uppercase' },
  avatarPicker: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 12, backgroundColor: Colors.surface, borderRadius: 20,
    padding: 16, marginTop: 15, width: '100%', borderWidth: 1, borderColor: Colors.border,
  },
  avatarOption: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceSubtle, borderWidth: 2, borderColor: 'transparent',
  },
  avatarOptionSelected: { borderColor: Colors.primary, backgroundColor: Colors.surface },
  avatarOptionEmoji: { fontSize: 28 },
  
  userName: { fontSize: 24, fontWeight: 'bold', color: Colors.textPrimary, marginTop: 15 },
  userEmail: { fontSize: 14, color: Colors.textMuted, marginTop: 4 },
  joinBadge: { backgroundColor: Colors.surfaceSubtle, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginTop: 15 },
  joinBadgeText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textSecondary, marginHorizontal: 20, marginTop: 25, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15 },
  statCard: { width: '45%', backgroundColor: Colors.surface, borderRadius: 18, padding: 16, margin: '2.5%', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 4, fontWeight: '600' },
  
  badgesRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 15, justifyContent: 'space-between' },
  badgeWrapper: { alignItems: 'center', flex: 1 },
  badgeCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 2 },
  badgeUnlocked: { borderColor: Colors.accent, backgroundColor: 'rgba(219, 176, 107, 0.1)' },
  badgeLocked: { borderColor: Colors.border, opacity: 0.6 },
  badgeEmoji: { fontSize: 26 },
  badgeLabel: { fontSize: 10, color: Colors.textPrimary, marginTop: 8, fontWeight: 'bold', textAlign: 'center' },
  
  card: { backgroundColor: Colors.surface, borderRadius: 20, marginHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIcon: { fontSize: 18, marginRight: 15 },
  menuLabel: { fontSize: 16, color: Colors.textPrimary, fontWeight: '500' },
  menuArrow: { fontSize: 22, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 20 },
  
  signOutBtn: { backgroundColor: 'rgba(225, 106, 84, 0.15)', marginHorizontal: 20, marginTop: 30, borderRadius: 15, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(225, 106, 84, 0.3)' },
  signOutText: { color: Colors.primary, fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'center', padding: 25 },
  modalBox: { backgroundColor: Colors.surface, borderRadius: 25, padding: 24, borderWidth: 1, borderColor: Colors.border, elevation: 5 },
  modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.textPrimary },
  modalInput: { backgroundColor: Colors.surfaceSubtle, borderRadius: 12, padding: 14, color: Colors.textPrimary, fontSize: 16, marginBottom: 15, borderWidth: 1, borderColor: Colors.border },
  modalSave: { backgroundColor: Colors.primary, borderRadius: 15, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  modalSaveText: { color: Colors.background, fontWeight: 'bold', fontSize: 16 },
  
  // Stats Modal Specifics
  statsSummaryRow: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  summaryMiniCard: { flex: 1, backgroundColor: Colors.surfaceSubtle, borderRadius: 15, padding: 15, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: 'bold', color: Colors.accent },
  summaryLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  statModalSubtitle: { fontSize: 14, fontWeight: 'bold', color: Colors.textSecondary, marginBottom: 15, marginTop: 10, textTransform: 'uppercase' },
  heatmapRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120, marginBottom: 20 },
  heatCol: { alignItems: 'center', flex: 1 },
  heatBarBg: { width: 12, height: 80, backgroundColor: Colors.surfaceSubtle, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  heatBarFill: { width: '100%', backgroundColor: Colors.primary, borderRadius: 6 },
  heatLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 6, fontWeight: 'bold' },
  heatPct: { fontSize: 9, color: Colors.primary, marginTop: 2, fontWeight: 'bold' },
  worstFocusCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceSubtle, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: Colors.border },
  
  // Settings Modal Specifics
  settingPrefRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  dangerAction: { backgroundColor: 'rgba(225, 106, 84, 0.05)', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
});