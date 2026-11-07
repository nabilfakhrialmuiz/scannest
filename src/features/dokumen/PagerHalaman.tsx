import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { IconButton } from '@/components';
import { colors, radius, typography } from '@/theme';

import { urlTampil } from './gambar';
import type { HalamanDetail } from './skema';

const RASIO_HALAMAN = 4 / 3;

type PagerHalamanProps = {
  halaman: HalamanDetail[];
  /** Dipakai untuk label aksesibilitas gambar: "Halaman 2 dari <judul>". */
  judul: string;
  /** Dipanggil tiap halaman aktif berganti (geser atau tombol panah). */
  onIndeksBerubah?: (indeks: number) => void;
};

// Pager halaman dokumen: digeser mendatar atau lewat tombol panah, dengan penanda "Halaman n dari m".
// Dipakai bersama oleh detail dokumen pengguna (Fase 7) dan detail dokumen admin (Fase 8).
export function PagerHalaman({ halaman, judul, onIndeksBerubah }: PagerHalamanProps) {
  const [lebar, setLebar] = useState(0);
  const [indeks, setIndeksState] = useState(0);
  const daftar = useRef<FlatList<HalamanDetail>>(null);
  const tujuan = useRef<number | null>(null);
  const jumlah = halaman.length;
  const tinggi = lebar > 0 ? Math.round(lebar * RASIO_HALAMAN) : 0;

  const setIndeks = (ke: number) => {
    setIndeksState(ke);
    onIndeksBerubah?.(ke);
  };

  const geser = (ke: number) => {
    const sasaran = Math.max(0, Math.min(jumlah - 1, ke));
    if (sasaran === indeks) return;
    setIndeks(sasaran);
    // Selama animasi menuju `sasaran`, peristiwa gulir di tengah jalan diabaikan supaya penanda
    // "Halaman n dari m" tidak berkedip mundur lalu maju.
    tujuan.current = sasaran;
    daftar.current?.scrollToOffset({ offset: sasaran * lebar, animated: true });
  };

  const saatGulir = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (lebar <= 0) return;
    const ke = Math.round(e.nativeEvent.contentOffset.x / lebar);
    if (tujuan.current !== null) {
      if (ke !== tujuan.current) return;
      tujuan.current = null;
    }
    if (ke !== indeks) setIndeks(ke);
  };

  if (jumlah === 0) return null;
  const aktif = Math.min(indeks, jumlah - 1);

  return (
    <>
      <View
        onLayout={(e: LayoutChangeEvent) => setLebar(Math.round(e.nativeEvent.layout.width))}
        style={styles.pager}
      >
        {lebar > 0 ? (
          <FlatList
            ref={daftar}
            data={halaman}
            keyExtractor={(h) => h.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={saatGulir}
            onScrollBeginDrag={() => {
              tujuan.current = null;
            }}
            scrollEventThrottle={16}
            getItemLayout={(_, i) => ({ length: lebar, offset: lebar * i, index: i })}
            initialNumToRender={2}
            windowSize={3}
            renderItem={({ item }) => (
              <View style={{ width: lebar, height: tinggi }}>
                <Image
                  source={{ uri: urlTampil(item.urlHasil) ?? item.urlHasil }}
                  contentFit="contain"
                  transition={150}
                  accessibilityLabel={`Halaman ${item.urutan} dari ${judul}`}
                  style={styles.halaman}
                />
              </View>
            )}
          />
        ) : null}
      </View>
      <View style={styles.navigasi}>
        <IconButton
          icon="chevron-back"
          label="Halaman sebelumnya"
          onPress={() => geser(indeks - 1)}
          disabled={indeks <= 0}
        />
        <Text accessibilityLiveRegion="polite" style={styles.penanda}>
          Halaman {aktif + 1} dari {jumlah}
        </Text>
        <IconButton
          icon="chevron-forward"
          label="Halaman berikutnya"
          onPress={() => geser(indeks + 1)}
          disabled={indeks >= jumlah - 1}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pager: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.border,
  },
  halaman: { width: '100%', height: '100%' },
  navigasi: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  penanda: { ...typography.bodyStrong, color: colors.text },
});
