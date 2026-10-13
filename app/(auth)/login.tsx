import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Button, Screen, ScreenHeader, TextField } from '@/components';
import { colors, spacing, typography } from '@/theme';

// Kerangka tampilan saja. Validasi zod dan Supabase Auth dipasang di Fase 3.
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string>();

  return (
    <Screen scroll edges={['top', 'bottom']}>
      <ScreenHeader title="Masuk" subtitle="Selamat datang kembali di Scannest" />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={emailError}
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
        autoComplete="current-password"
        helper="Minimal 8 karakter"
      />
      <Button
        title="Masuk"
        fullWidth
        onPress={() => setEmailError(email.trim() ? undefined : 'Email wajib diisi')}
      />
      <Text style={styles.footer}>
        Belum punya akun?{' '}
        <Link href="/register" style={styles.link}>
          Daftar
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

