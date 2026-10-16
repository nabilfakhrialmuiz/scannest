import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/theme';

// Layar tunggu satu halaman penuh, dipakai selagi status masuk sedang ditentukan.
export function LoadingScreen({ message = 'Memuat...' }: { message?: string }) {
  return (
    <View style={styles.root} accessibilityLabel={message} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  text: { ...typography.body, color: colors.textMuted },
});