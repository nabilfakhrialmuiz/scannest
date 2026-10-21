import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Chip, EmptyState, TextField } from '@/components';
import { useDebouncedValue } from '@/features/editor';
import { colors, spacing, typography } from '@/theme';

import { FILTER_STATUS, LABEL_FILTER, type FilterStatus } from './daftar';
import { pesanGalat } from './galat';
import { kunciDokumen, useDaftarDokumen } from './hooks';
import { KartuDokumen, KartuDokumenKerangka } from './KartuDokumen';

type DaftarDokumenProps = {
  userId: string;
  /** Bagian paling atas (judul, kartu akun, dsb.) yang ikut tergulir bersama daftar. */
  atas?: ReactNode;
};

const JEDA_CARI_MS = 400;

// Daftar dokumen di Dashboard (tugas 7.1, 7.6, 7.7): FlatList dengan paginasi 20 baris,
// pull-to-refresh, pencarian judul (ditunda 400 ms), filter status, skeleton, dan empty state.
export function DaftarDokumen({ userId, atas }: DaftarDokumenProps) {
  const router = useRouter();
  const klien = useQueryClient();
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<FilterStatus>('semua');
  const [menyegarkan, setMenyegarkan] = useState(false);
  const kata = useDebouncedValue(input, JEDA_CARI_MS);
  const q = useDaftarDokumen(userId, status, kata.trim());

  // Segarkan tiap Dashboard kembali terlihat (mis. setelah menyimpan efek di editor atau menghapus
  // dokumen). Fokus pertama dilewati karena kueri sudah berjalan sendiri saat layar dibuka.
  const pertama = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (pertama.current) {
        pertama.current = false;
        return;
      }
      void klien.invalidateQueries({ queryKey: kunciDokumen.semua(userId) });
    }, [klien, userId]),
  );

  const tarikSegar = async () => {
    setMenyegarkan(true);
    try {
      await q.refetch();
    } finally {
      setMenyegarkan(false);
    }
  };

  const adaPenyaring = status !== 'semua' || kata.trim() !== '';
  const bukaDokumen = (id: string) => router.push({ pathname: '/dokumen/[id]', params: { id } });

  const kepala = (
    <View style={styles.kepala}>
      {atas}
      <TextField
        label="Cari dokumen"
        placeholder="Ketik judul dokumen"
        value={input}
        onChangeText={setInput}
        returnKeyType="search"
        autoCorrect={false}
        maxLength={100}
      />
      <View style={styles.chip}>
        {FILTER_STATUS.map((nilai) => (
          <Chip
            key={nilai}
            label={LABEL_FILTER[nilai]}
            selected={status === nilai}
            onPress={() => setStatus(nilai)}
          />
        ))}
      </View>
    </View>
  );

  let kosong: ReactNode = null;
  if (q.isPending) {
    kosong = (
      <View accessibilityLabel="Memuat dokumen" accessibilityLiveRegion="polite" style={styles.gap}>
        {[0, 1, 2, 3].map((i) => (
          <KartuDokumenKerangka key={i} />
        ))}
      </View>
    );
  } else if (q.isError && !q.data) {
    kosong = (
      <View style={styles.gap}>
        <Banner message={pesanGalat(q.error, 'Daftar dokumen belum bisa dimuat.')} />
        <Button title="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
      </View>
    );
  } else if (adaPenyaring) {
    kosong = (
      <EmptyState
        icon="search-outline"
        title="Tidak ada dokumen yang cocok"
        description="Coba kata kunci lain atau ubah filter statusnya."
        actionLabel="Hapus pencarian dan filter"
        onAction={() => {
          setInput('');
          setStatus('semua');
        }}
      />
    );
  } else {
    kosong = (
      <EmptyState
        icon="document-text-outline"
        title="Belum ada dokumen"
        description="Scan dokumen pertamamu lewat tab Kamera. Hasilnya akan muncul di sini."
        actionLabel="Mulai scan"
        onAction={() => router.navigate('/kamera')}
      />
    );
  }

  const kaki = q.isFetchNextPageError ? (
    <View style={styles.gap}>
      <Banner message="Dokumen berikutnya belum bisa dimuat." />
      <Button title="Muat lagi" variant="secondary" onPress={() => void q.fetchNextPage()} />
    </View>
  ) : q.isFetchingNextPage ? (
    <View accessibilityLabel="Memuat dokumen berikutnya" style={styles.kaki}>
      <ActivityIndicator color={colors.primary} />
    </View>
  ) : q.hasNextPage ? null : (q.data?.length ?? 0) > 0 ? (
    <Text style={styles.akhir}>
      <Ionicons name="checkmark-circle-outline" size={14} color={colors.textMuted} /> Semua dokumen
      sudah tampil
    </Text>
  ) : null;

  return (
    <FlatList
      data={q.isPending ? [] : (q.data ?? [])}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <KartuDokumen dokumen={item} onPress={() => bukaDokumen(item.id)} />
      )}
      ListHeaderComponent={kepala}
      ListEmptyComponent={kosong}
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
  kepala: { gap: spacing.lg, marginBottom: spacing.lg },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
});