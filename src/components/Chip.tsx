import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

// Pilihan filter berbentuk pil. Status terpilih diumumkan lewat accessibilityState, bukan warna saja.
export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.idle,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, { color: selected ? colors.onPrimary : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTouchSize,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexGrow: 0,
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  idle: { backgroundColor: colors.surface, borderColor: colors.inputBorder },
  pressed: { opacity: 0.85 },
  label: { ...typography.bodyStrong },
});