import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useQueryClient, type UseInfiniteQueryResult } from '@tanstack/react-query';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Card, Skeleton } from '@/components';
import { colors, spacing, typography } from '@/theme';

import { pesanGalat } from './galat';

type ListaBerhalamanProps<T extends { id: string }> = {
  /** Hasil useInfiniteQuery yang `select`-nya sudah menggabungkan halaman menjadi satu larik. */
  q: UseInfiniteQueryResult<T[], Error>;
  renderItem: (item: T) => ReactElement;
  /** Bagian atas daftar (kolom cari, chip filter, pemberitahuan) yang ikut tergulir. */
  kepala: ReactElement;
  /** Isi daftar saat tidak ada baris (empty state); pemanggil yang tahu apakah filter aktif. */
  kosong: ReactElement;
  /** Label aksesibilitas untuk blok kerangka. */
  labelMemuat: string;
  /** Kunci cache yang disegarkan setiap layar ini kembali terlihat (mis. setelah detail dihapus). */
  kunciSegar: readonly unknown[];
  pesanGagalMuat: string;
};

// Daftar berhalaman bersama untuk layar admin: skeleton, pesan galat dengan "Coba lagi",
// pull-to-refresh, muat otomatis saat mencapai ujung, dan penanda "semua sudah tampil".
export function ListaBerhalaman<T extends { id: string }>({
  q,
  renderItem,
  kepala,
  kosong,
  labelMemuat,
  kunciSegar,
  pesanGagalMuat,
}: ListaBerhalamanProps<T>) {
  const klien = useQueryClient();
  const [menyegarkan, setMenyegarkan] = useState(false);

  // Fokus pertama dilewati karena kueri sudah berjalan sendiri saat layar dibuka.
  const pertama = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (pertama.current) {
        pertama.current = false;
        return;
      }
      void klien.invalidateQueries({ queryKey: kunciSegar });
    }, [klien, kunciSegar]),
  );

  const tarikSegar = async () => {
    setMenyegarkan(true);
    try {
      await q.refetch();
    } finally {
      setMenyegarkan(false);
    }
  };

  let isiKosong: ReactElement;
  if (q.isPending) {
    isiKosong = (
      <View accessibilityLabel={labelMemuat} accessibilityLiveRegion="polite" style={styles.gap}>
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} style={styles.kerangka}>
            <Skeleton style={styles.kerangkaJudul} />
            <Skeleton style={styles.kerangkaInfo} />
          </Card>
        ))}
      </View>
    );
  } else if (q.isError && !q.data) {
    isiKosong = (
      <View style={styles.gap}>
        <Banner message={pesanGalat(q.error, pesanGagalMuat)} />
        <Button title="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
      </View>
    );
  } else {
    isiKosong = kosong;
  }

  const kaki = q.isFetchNextPageError ? (
    <View style={styles.gap}>
      <Banner message="Data berikutnya belum bisa dimuat." />
      <Button title="Muat lagi" variant="secondary" onPress={() => void q.fetchNextPage()} />
    </View>
  ) : q.isFetchingNextPage ? (
    <View accessibilityLabel="Memuat data berikutnya" style={styles.kaki}>
      <ActivityIndicator color={colors.primary} />
    </View>
  ) : q.hasNextPage ? null : (q.data?.length ?? 0) > 0 ? (
    <Text style={styles.akhir}>
      <Ionicons name="checkmark-circle-outline" size={14} color={colors.textMuted} /> Semua data
      sudah tampil
    </Text>
  ) : null;

  return (
    <FlatList
      data={q.isPending ? [] : (q.data ?? [])}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => renderItem(item)}
      ListHeaderComponent={kepala}
      ListEmptyComponent={isiKosong}
      ListFooterComponent={kaki}
      contentContainerStyle={styles.isi}
      ItemSeparatorComponent={Pemisah}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (q.hasNextPage && !q.isFetchingNextPage && !q.isFetchNextPageError) {
          void q.fetchNextPage();
        }
      }}
      refreshControl={
        <RefreshControl
          refreshing={menyegarkan}
          onRefresh={() => void tarikSegar()}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      style={q.isPlaceholderData ? styles.menunggu : undefined}
    />
  );
}

function Pemisah() {
  return <View style={styles.pemisah} />;
}

const styles = StyleSheet.create({
  isi: { padding: spacing.lg, flexGrow: 1 },
  gap: { gap: spacing.md },
  pemisah: { height: spacing.md },
  kaki: { paddingVertical: spacing.lg },
  akhir: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  menunggu: { opacity: 0.6 },
  kerangka: { gap: spacing.sm },
  kerangkaJudul: { height: 18, width: '60%' },
  kerangkaInfo: { height: 14, width: '40%' },
});
