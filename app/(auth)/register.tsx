import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, Screen, ScreenHeader, TextField } from '@/components';
import { colors, spacing, typography } from '@/theme';

// Kerangka tampilan saja. Validasi zod dan Supabase Auth dipasang di Fase 3.
export default function RegisterScreen() {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title="Daftar" subtitle="Buat akun untuk mulai memindai dokumen" />
      <TextField
        label="Nama"
        value={nama}
        onChangeText={setNama}
        autoComplete="name"
        placeholder="Nama lengkapmu"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="nama@email.com"
      />
      <TextField
        label="Kata sandi"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        helper="Minimal 8 karakter"
      />
      <Button title="Buat akun" fullWidth />
      <Text style={styles.footer}>
        Sudah punya akun?{' '}
        <Link href="/login" style={styles.link}>
          Masuk
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  link: { fontFamily: typography.bodyStrong.fontFamily, color: colors.primary },
});

