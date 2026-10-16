import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card } from '@/components';
import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

import { useAuth } from './AuthProvider';

// Kartu akun di Dashboard: siapa yang sedang masuk, jalan pintas ke panel admin, dan tombol keluar.
export function AccountCard() {
  const router = useRouter();
  const { profile, session, isAdmin, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (!profile) return null;

  const initial = (profile.nama.trim()[0] ?? session?.user.email?.[0] ?? '?').toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    // Setelah keluar, guard rute memindahkan pengguna ke layar masuk dan layar ini dilepas.
    setSigningOut(false);
  }

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {profile.nama || 'Pengguna Scannest'}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {session?.user.email}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{isAdmin ? 'Admin' : 'Pengguna'}</Text>
        </View>
      </View>
      {isAdmin ? (
        <Button
          title="Buka panel admin"
          variant="secondary"
          onPress={() => router.push('/admin')}
        />
      ) : null}
      <Button
        title="Keluar"
        variant="ghost"
        fullWidth
        loading={signingOut}
        onPress={handleSignOut}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: minTouchSize,
    height: minTouchSize,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.heading, color: colors.primary },
  identity: { flex: 1 },
  name: { ...typography.bodyStrong, color: colors.text },
  email: { ...typography.caption, color: colors.textMuted },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  badgeText: { ...typography.caption, color: colors.primary },
});

