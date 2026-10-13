import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Pesan galat. Bila ada, garis dan pesan berwarna danger. */
  error?: string;
  /** Petunjuk di bawah kolom (disembunyikan saat ada galat). */
  helper?: string;
};

export function TextField({
  label,
  error,
  helper,
  secureTextEntry,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = Boolean(secureTextEntry);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.inputBorder;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.field, { borderColor, borderWidth: focused || error ? 2 : 1 }]}>
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          secureTextEntry={isPassword && hidden}
          placeholderTextColor={colors.textMuted}
          onFocus={(event) => {
            setFocused(true);
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            inputProps.onBlur?.(event);
          }}
          style={styles.input}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Tampilkan kata sandi' : 'Sembunyikan kata sandi'}
            onPress={() => setHidden((value) => !value)}
            hitSlop={8}
            style={styles.toggle}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: { ...typography.bodyStrong, color: colors.text },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouchSize,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, ...typography.body, color: colors.text, paddingVertical: spacing.sm },
  toggle: { paddingLeft: spacing.sm },
  helper: { ...typography.caption, color: colors.textMuted },
  error: { ...typography.caption, color: colors.danger },
});
