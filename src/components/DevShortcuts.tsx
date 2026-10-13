import { useRouter, type Href } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '@/theme';

import { Button } from './Button';
import { Card } from './Card';

type Shortcut = { label: string; href: Href };

const shortcuts: Shortcut[] = [
  { label: 'Login', href: '/login' },
  { label: 'Daftar', href: '/register' },
  { label: 'Detail dokumen (contoh)', href: '/dokumen/contoh' },
  { label: 'Editor (contoh)', href: '/editor/contoh' },
  { label: 'Admin: dashboard', href: '/admin' },
  { label: 'Admin: pengguna', href: '/admin/pengguna' },
  { label: 'Admin: dokumen', href: '/admin/dokumen' },
  { label: 'Admin: log aktivitas', href: '/admin/log' },
];

// Hanya tampil saat pengembangan (`__DEV__`). Dihapus di Fase 3 saat login dan peran aktif.
export function DevShortcuts() {
  const router = useRouter();

  return (
    <Card>
      <Text style={styles.title}>Pintasan pengembangan</Text>
      <Text style={styles.note}>Untuk menguji rute selama fase awal. Tidak tampil di rilis.</Text>
      {shortcuts.map((item) => (
        <Button
          key={item.label}
          title={item.label}
          variant="secondary"
          fullWidth
          onPress={() => router.push(item.href)}
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.heading, color: colors.text },
  note: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
});