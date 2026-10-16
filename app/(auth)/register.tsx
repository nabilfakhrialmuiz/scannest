import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Banner, Button, EmptyState, Screen, ScreenHeader, TextField } from '@/components';
import { registerSchema, useAuth, validate, type RegisterValues } from '@/features/auth';
import { colors, spacing, typography } from '@/theme';

type FieldErrors = Partial<Record<keyof RegisterValues, string>>;

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [waitingConfirmation, setWaitingConfirmation] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    setFormError(undefined);

    const result = validate(registerSchema, { nama, email, password });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    const response = await signUp(result.data.nama, result.data.email, result.data.password);
    setSubmitting(false);

    if (!response.ok) {
      setFormError(response.message);
    } else if (response.needsConfirmation) {
      // Konfirmasi email aktif: belum ada sesi, jadi tampilkan petunjuk. Bila tidak aktif, sesi
      // langsung terbentuk dan guard rute memindahkan pengguna ke Dashboard.
      setWaitingConfirmation(true);
    }
  }

  if (waitingConfirmation) {
    return (
      <Screen scroll edges={['top', 'bottom']}>
        <EmptyState
          icon="mail-outline"
          title="Cek emailmu"
          description="Kami mengirim tautan konfirmasi ke emailmu. Klik tautan itu, lalu kembali ke sini dan masuk."
          actionLabel="Ke halaman masuk"
          onAction={() => router.replace('/login')}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll avoidKeyboard edges={['top', 'bottom']}>
      <ScreenHeader title="Daftar" subtitle="Buat akun untuk mulai memindai dokumen" />
      {formError ? <Banner message={formError} /> : null}
      <TextField
        label="Nama"
        value={nama}
        onChangeText={setNama}
        error={errors.nama}
        autoComplete="name"
        autoCapitalize="words"
        returnKeyType="next"
        placeholder="Nama lengkapmu"
      />
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
        autoComplete="new-password"
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        helper="Minimal 8 karakter"
      />
      <Button title="Buat akun" fullWidth loading={submitting} onPress={handleSubmit} />
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