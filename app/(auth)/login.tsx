import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Banner, Button, Screen, ScreenHeader, TextField } from '@/components';
import { loginSchema, useAuth, validate, type LoginValues } from '@/features/auth';
import { colors, spacing, typography } from '@/theme';

type FieldErrors = Partial<Record<keyof LoginValues, string>>;

export default function LoginScreen() {
  const { signIn, notice, clearNotice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    clearNotice();
    setFormError(undefined);

    // 1) Cek isian di perangkat dulu, supaya kesalahan ketik tidak perlu ke server.
    const result = validate(loginSchema, { email, password });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    // 2) Kirim ke Supabase. Bila berhasil, guard rute di app/_layout.tsx memindahkan ke Dashboard.
    setSubmitting(true);
    const response = await signIn(result.data.email, result.data.password);
    if (!response.ok) {
      setFormError(response.message);
    }
    setSubmitting(false);
  }

  return (
    <Screen scroll avoidKeyboard edges={['top', 'bottom']}>
      <ScreenHeader title="Masuk" subtitle="Selamat datang kembali di Scannest" />
      {notice ? <Banner variant="info" message={notice} /> : null}
      {formError ? <Banner message={formError} /> : null}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        returnKeyType="next"
        placeholder="nama@email.com"
      />
      <TextField
        label="Kata sandi"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
      />
      <Button title="Masuk" fullWidth loading={submitting} onPress={handleSubmit} />
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