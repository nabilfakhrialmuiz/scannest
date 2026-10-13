import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/theme';

export default function AuthLayout() {
  return <Stack screenOptions={{ ...stackScreenOptions, headerShown: false }} />;
}

