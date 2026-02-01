import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const params = useLocalSearchParams();
  const userName = params.name || 'User';
  const [todayCompleted] = useState(2);
  const [todayTotal] = useState(4);
  const [bestStreak] = useState(15);
  const [missedHabits] = useState(3);

  // Mock habits data
  const [habits] = useState([
    {
      id: 1,
      name: 'Morning Meditation',
      icon: '🧘',
      difficulty: 'Easy',
      streak: 12,
      completed: true,
    },
    {
      id: 2,
      name: 'Read 30 Minutes',
      icon: '📚',
      difficulty: 'Medium',
      streak: 8,
      completed: true,
    },
    {
      id: 3,
      name: 'Workout',
      icon: '💪',
      difficulty: 'Hard',
      streak: 5,
      completed: false,
    },
    {
      id: 4,
      name: 'Drink 8 Glasses Water',
      icon: '💧',
      difficulty: 'Easy',
      streak: 20,
      completed: false,
    },
  ]);

  // Get current date
  const getCurrentDate = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const date = new Date();
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const toggleHabit = (id) => {
    // TODO: Update habit completion status
    console.log('Toggle habit:', id);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {userName} 👋</Text>
          <Text style={styles.date}>{getCurrentDate()}</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Text style={styles.bellIcon}>🔔</Text>
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.todayCard]}>
            <Text style={styles.statIcon}>✓</Text>
            <Text style={styles.statLabel}>Today</Text>
            <Text style={styles.statValue}>{todayCompleted}/{todayTotal}</Text>
          </View>

          <View style={[styles.statCard, styles.bestCard]}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={styles.statLabel}>Best</Text>
            <Text style={styles.statValue}>{bestStreak}</Text>
          </View>

          <View style={[styles.statCard, styles.missedCard]}>
            <Text style={styles.statIcon}>📉</Text>
            <Text style={styles.statLabel}>Missed</Text>
            <Text style={styles.statValue}>{missedHabits}</Text>
          </View>
        </View>

        {/* Alert Box */}
        {missedHabits > 0 && (
          <View style={styles.alertBox}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{missedHabits} habits need attention</Text>
              <Text style={styles.alertSubtitle}>Don't worry! Let's reflect and get back on track.</Text>
            </View>
          </View>
        )}

        {/* Today's Habits Section */}
        <View style={styles.habitsHeader}>
          <Text style={styles.habitsTitle}>Today's Habits</Text>
          <TouchableOpacity>
            <Text style={styles.addNewButton}>Add New</Text>
          </TouchableOpacity>
        </View>

        {/* Habits List */}
        <View style={styles.habitsList}>
          {habits.map((habit) => (
            <TouchableOpacity 
              key={habit.id} 
              style={styles.habitCard}
              onPress={() => toggleHabit(habit.id)}
            >
              <View style={styles.habitIconContainer}>
                <Text style={styles.habitIcon}>{habit.icon}</Text>
              </View>
              
              <View style={styles.habitInfo}>
                <Text style={styles.habitName}>{habit.name}</Text>
                <Text style={styles.habitDifficulty}>{habit.difficulty}</Text>
              </View>

              <View style={styles.habitRight}>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakIcon}>🔥</Text>
                  <Text style={styles.streakText}>{habit.streak}</Text>
                </View>
                <View style={[styles.checkCircle, habit.completed && styles.checkCircleCompleted]}>
                  {habit.completed && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIconActive}>🏠</Text>
          <Text style={styles.navLabelActive}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navLabel}>Insights</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🔔</Text>
          <Text style={styles.navLabel}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingButton}>
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  date: {
    fontSize: 14,
    color: '#a0a0a0',
    marginTop: 4,
  },
  notificationButton: {
    position: 'relative',
  },
  bellIcon: {
    fontSize: 24,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e94560',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  todayCard: {
    backgroundColor: '#2a2a4e',
  },
  bestCard: {
    backgroundColor: '#3a2a1e',
  },
  missedCard: {
    backgroundColor: '#3a2a3e',
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#a0a0a0',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  alertBox: {
    flexDirection: 'row',
    backgroundColor: '#3a2a1e',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5a4a3e',
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f0a500',
    marginBottom: 4,
  },
  alertSubtitle: {
    fontSize: 13,
    color: '#c0a080',
  },
  habitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  habitsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  addNewButton: {
    fontSize: 16,
    color: '#6c63ff',
    fontWeight: '600',
  },
  habitsList: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252541',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3a3a52',
  },
  habitIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  habitIcon: {
    fontSize: 24,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  habitDifficulty: {
    fontSize: 13,
    color: '#a0a0a0',
  },
  habitRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a2a1e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  streakIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff9500',
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#3a3a52',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkMark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#16213e',
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#2a2a4e',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 22,
    marginBottom: 4,
    opacity: 0.5,
  },
  navIconActive: {
    fontSize: 22,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 11,
    color: '#a0a0a0',
  },
  navLabelActive: {
    fontSize: 11,
    color: '#6c63ff',
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6c63ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonText: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: '300',
  },
});