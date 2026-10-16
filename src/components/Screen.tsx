import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = {
  children: ReactNode;
  /** true: isi bisa digulir (layar panjang atau berisi formulir). */
  scroll?: boolean;
  /** Sisi layar yang diberi jarak aman. Layar tab: ['top']. Layar dengan header bawaan: ['bottom']. */
  edges?: Edge[];
  /** false: tanpa padding bawaan (untuk konten tepi ke tepi). */
  padded?: boolean;
  /** true: konten naik saat keyboard terbuka. Pakai di layar berisi kolom isian. */
  avoidKeyboard?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  children,
  scroll = false,
  edges = ['top'],
  padded = true,
  avoidKeyboard = false,
  contentStyle,
}: ScreenProps) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, padded && styles.padded, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, padded && styles.padded, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {avoidKeyboard ? (
        // Dengan edge-to-edge (SDK 54), Android tidak lagi menaikkan layar sendiri saat keyboard
        // terbuka, jadi kita yang mengaturnya: padding setinggi keyboard di bawah konten.
        <KeyboardAvoidingView behavior="padding" style={styles.fill}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  padded: { padding: spacing.lg, gap: spacing.lg },
});

