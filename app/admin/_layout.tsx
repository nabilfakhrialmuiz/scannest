import { Stack } from 'expo-router';

import { stackScreenOptions } from '@/theme';

// Folder biasa `admin` (bukan grup) agar URL-nya /admin dan tidak bentrok dengan Dashboard di "/".
// Akses dibatasi di app/_layout.tsx (Stack.Protected): hanya akun dengan role admin yang bisa masuk.
export default function AdminLayout() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ title: 'Panel admin' }} />
      <Stack.Screen name="pengguna" options={{ title: 'Pengguna' }} />
      <Stack.Screen name="dokumen" options={{ title: 'Dokumen' }} />
      <Stack.Screen name="log" options={{ title: 'Log aktivitas' }} />
    </Stack>
  );
}