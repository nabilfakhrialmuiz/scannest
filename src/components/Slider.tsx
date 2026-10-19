import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

const THUMB = 28;
const GARIS = 6;

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Nilai selalu dibulatkan ke kelipatan ini. */
  step?: number;
  onChange: (value: number) => void;
  /** Teks nilai di kanan label, misalnya "+20". */
  formatValue?: (value: number) => string;
  disabled?: boolean;
};

// Slider buatan sendiri (tanpa paket tambahan): seluruh baris setinggi 48 dp bisa disentuh atau
// digeser. Pembaca layar memakai aksi "tambah" dan "kurang" (accessibilityActions).
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  formatValue = String,
  disabled = false,
}: SliderProps) {
  const [lebar, setLebar] = useState(0);

  // PanResponder dibuat sekali, jadi ia membaca nilai terbaru lewat ref.
  const terbaru = useRef({ lebar, min, max, step, onChange, value, disabled });
  useEffect(() => {
    terbaru.current = { lebar, min, max, step, onChange, value, disabled };
  });
  const awalX = useRef(0);

  const [pan] = useState(() => {
    const nilaiDariX = (x: number) => {
      const t = terbaru.current;
      const area = Math.max(1, t.lebar - THUMB);
      const rasio = Math.min(1, Math.max(0, (x - THUMB / 2) / area));
      const langkah = Math.round((t.min + rasio * (t.max - t.min)) / t.step) * t.step;
      return Math.min(t.max, Math.max(t.min, langkah));
    };
    const ubah = (nilai: number) => {
      const t = terbaru.current;
      if (nilai === t.value) return;
      t.value = nilai;
      t.onChange(nilai);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !terbaru.current.disabled,
      onMoveShouldSetPanResponder: () => !terbaru.current.disabled,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => {
        awalX.current = event.nativeEvent.locationX;
        ubah(nilaiDariX(awalX.current));
      },
      onPanResponderMove: (_, gesture) => ubah(nilaiDariX(awalX.current + gesture.dx)),
    });
  });

  const rasio = max === min ? 0 : (value - min) / (max - min);
  const posisi = rasio * Math.max(0, lebar - THUMB);
  const geser = (arah: 1 | -1) =>
    onChange(Math.min(max, Math.max(min, Math.round((value + arah * step) / step) * step)));

  return (
    <View style={styles.wrapper}>
      <View style={styles.baris}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.nilai}>{formatValue(value)}</Text>
      </View>
      <View
        {...pan.panHandlers}
        onLayout={(event: LayoutChangeEvent) => setLebar(event.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: formatValue(value) }}
        // Padanan aria-* untuk web (react-native-web tidak memetakan accessibilityValue).
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatValue(value)}
        accessibilityState={{ disabled }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (disabled) return;
          if (event.nativeEvent.actionName === 'increment') geser(1);
          if (event.nativeEvent.actionName === 'decrement') geser(-1);
        }}
        style={[styles.area, disabled && styles.disabled]}
      >
        <View style={styles.garis} />
        <View style={[styles.isi, { width: posisi }]} />
        <View style={[styles.thumb, { left: posisi }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  baris: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...typography.bodyStrong, color: colors.text },
  nilai: { ...typography.bodyStrong, color: colors.text },
  area: { height: minTouchSize, justifyContent: 'center' },
  // Anak-anak tidak menerima sentuhan supaya `locationX` selalu relatif terhadap area ini.
  garis: {
    position: 'absolute',
    left: THUMB / 2,
    right: THUMB / 2,
    height: GARIS,
    borderRadius: radius.pill,
    backgroundColor: colors.inputBorder,
    pointerEvents: 'none',
  },
  isi: {
    position: 'absolute',
    left: THUMB / 2,
    height: GARIS,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    pointerEvents: 'none',
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
    pointerEvents: 'none',
  },
  disabled: { opacity: 0.4 },
});
