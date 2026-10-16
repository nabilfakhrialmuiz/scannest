import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/theme';

type BannerProps = {
  message: string;
  /** error: kegagalan. info: pemberitahuan atau keberhasilan. */
  variant?: 'error' | 'info';
};

// Teks selalu memakai warna teks utama (kontras tinggi); hanya ikon yang berwarna.
const variantStyles = {
  error: { background: colors.dangerSoft, icon: colors.danger, name: 'alert-circle' },
  info: { background: colors.primarySoft, icon: colors.primary, name: 'information-circle' },
} as const;

// Kotak pesan untuk galat tingkat formulir atau pemberitahuan. Pesan dibacakan pembaca layar.
export function Banner({ message, variant = 'error' }: BannerProps) {
  const palette = variantStyles[variant];
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.box, { backgroundColor: palette.background }]}
    >
      <Ionicons name={palette.name} size={20} color={palette.icon} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  text: { ...typography.body, color: colors.text, flex: 1 },
});