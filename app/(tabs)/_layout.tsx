import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { colors, fonts } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

// Satu tempat untuk ikon tab: ikon terisi saat aktif, ikon garis saat tidak aktif.
// Ukuran dikunci 24 agar ikon dan label muat dalam tinggi tab bar bawaan (49 dp + area aman).
function tabIcon(active: IconName, inactive: IconName) {
  return function TabIcon({ color, focused }: { color: string; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={24} color={color} />;
  };
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 13 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="kamera"
        options={{ title: 'Kamera', tabBarIcon: tabIcon('camera', 'camera-outline') }}
      />
      <Tabs.Screen
        name="percantik"
        options={{ title: 'Percantik', tabBarIcon: tabIcon('sparkles', 'sparkles-outline') }}
      />
    </Tabs>
  );
}
