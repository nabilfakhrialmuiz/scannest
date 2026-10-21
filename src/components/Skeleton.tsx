import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme';

type SkeletonProps = { style?: StyleProp<ViewStyle> };

// Blok abu-abu berdenyut sebagai pengganti konten yang sedang dimuat. Tidak dibacakan pembaca
// layar (pembungkusnya yang memberi tahu "memuat").
export function Skeleton({ style }: SkeletonProps) {
  const redup = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const putaran = Animated.loop(
      Animated.sequence([
        Animated.timing(redup, {
          toValue: 1,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(redup, {
          toValue: 0.55,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    putaran.start();
    return () => putaran.stop();
  }, [redup]);

  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      style={[styles.blok, { opacity: redup }, style]}
    />
  );
}

const styles = StyleSheet.create({
  blok: { backgroundColor: colors.border, borderRadius: radius.sm },
});