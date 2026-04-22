import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

import { Colors } from '../utils/theme';

const BottomNav = () => {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', icon: '🏠', path: '/home' },
    { label: 'Calendar', icon: '📅', path: '/calender' },
    { label: 'Timer', icon: '⏳', path: '/timer' },
    { label: 'Insights', icon: '📊', path: '/insights' },
    { label: 'Alerts', icon: '🔔', path: '/alerts' },
    { label: 'Profile', icon: '👤', path: '/profile' },
  ];

  return (
    <View style={styles.bottomNav}>
      {navItems.map((item) => {
        const isActive = pathname === (item.path as any);
        return (
          <TouchableOpacity
            key={item.path}
            style={styles.navItem}
            onPress={() => !isActive && router.push(item.path as any)}
          >
            <Text style={[isActive ? styles.navIconActive : styles.navIcon, isActive && { color: Colors.primary }]}>
              {item.icon}
            </Text>
            <Text style={isActive ? styles.navLabelActive : styles.navLabel}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default BottomNav;

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: Colors.surface, // Rich Espresso
    paddingBottom: 25,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 20, opacity: 0.6, color: Colors.textMuted },
  navIconActive: { fontSize: 20, color: Colors.primary }, // Use Salmon primary
  navLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  navLabelActive: { fontSize: 10, color: Colors.primary, marginTop: 4, fontWeight: 'bold' },
});
