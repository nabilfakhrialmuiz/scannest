import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors, minTouchSize, radius } from '@/theme';

type IconButtonProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Wajib: tombol ikon tidak punya teks, jadi labelnya yang dibacakan pembaca layar. */
  label: string;
  onPress?: () => void;
  /** soft: latar hijau lembut. scrim: di atas pratinjau kamera. danger: aksi menghapus. */
  tone?: 'soft' | 'scrim' | 'danger';
  disabled?: boolean;
};

const tones = {
  soft: { background: colors.primarySoft, icon: colors.primary },
  scrim: { background: colors.scrim, icon: colors.onScrim },
  danger: { background: colors.dangerSoft, icon: colors.danger },
} as const;

export function IconButton({
  icon,
  label,
  onPress,
  tone = 'soft',
  disabled = false,
}: IconButtonProps) {
  const palette = tones[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.12)', borderless: false }}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.background },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={palette.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: minTouchSize,
    height: minTouchSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
});

