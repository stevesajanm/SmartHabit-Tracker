// ─────────────────────────────────────────────────────────────
// index.tsx — Welcome / Splash Screen
// First screen users see when opening the app
// ─────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../utils/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = await AsyncStorage.getItem('@jwt_token');
        if (token) {
          router.replace('/home');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setChecking(false);
      }
    };
    checkUser();
  }, []);

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎯</Text>
      <Text style={styles.title}>SmartHabit Tracker</Text>
      <Text style={styles.tagline}>Track habits, learn from failures</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/login')}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>

      <Text style={styles.version}>v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emoji: { fontSize: 72, marginBottom: 20 },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 60,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    elevation: 4,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  version: {
    position: 'absolute',
    bottom: 30,
    fontSize: 12,
    color: Colors.border,
  },
});