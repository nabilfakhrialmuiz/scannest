import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  /** true: tampil spinner dan tombol tidak bisa disentuh. */
  loading?: boolean;
  disabled?: boolean;
  /** true: lebar penuh. Bawaan: selebar isinya. */
  fullWidth?: boolean;
};

const variantStyles: Record<ButtonVariant, { background: string; text: string }> = {
  primary: { background: colors.primary, text: colors.onPrimary },
  secondary: { background: colors.primarySoft, text: colors.primary },
  ghost: { background: 'transparent', text: colors.primary },
  danger: { background: colors.danger, text: colors.onDanger },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const inactive = disabled || loading;
  const palette = variantStyles[variant];
  const containerStyle: ViewStyle = {
    backgroundColor: palette.background,
    alignSelf: fullWidth ? 'stretch' : 'center',
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
      style={({ pressed }) => [
        styles.base,
        containerStyle,
        inactive && styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text style={[styles.label, { color: palette.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchSize,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  label: { ...typography.button, textAlign: 'center' },
  inactive: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});