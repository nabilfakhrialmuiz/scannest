import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import {
  Banner,
  Button,
  Dialog,
  EmptyState,
  IconButton,
  Screen,
  Skeleton,
  TextField,
} from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import { formatTanggal, labelHalaman } from './daftar';
import { pesanGalat } from './galat';
import { urlTampil } from './gambar';
import { kunciDokumen, useDetailDokumen, useHapusDokumen, useUbahJudul } from './hooks';
import { LabelStatus } from './KartuDokumen';
import { judulSchema } from './judul';
import type { HalamanDetail } from './skema';

const RASIO_HALAMAN = 4 / 3;

// Detail dokumen (tugas 7.3-7.5): halaman digeser mendatar (atau lewat tombol panah), judul bisa
// diganti, dan dokumen bisa dihapus setelah konfirmasi.
export function DetailDokumen({ userId, dokumenId }: { userId: string; dokumenId: string }) {
  const router = useRouter();
  const klien = useQueryClient();
  const q = useDetailDokumen(userId, dokumenId);
  const ubah = useUbahJudul(userId);
  const hapus = useHapusDokumen(userId);

  const [dialog, setDialog] = useState<'nama' | 'hapus' | null>(null);
  const [judulBaru, setJudulBaru] = useState('');
  const [galatJudul, setGalatJudul] = useState<string | null>(null);
  const [lebar, setLebar] = useState(0);
  const [indeks, setIndeks] = useState(0);
  const daftar = useRef<FlatList<HalamanDetail>>(null);
  const tujuan = useRef<number | null>(null);

  // Segarkan tiap layar ini kembali terlihat (mis. setelah menyimpan efek di editor).
  const pertama = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (pertama.current) {
        pertama.current = false;
        return;
      }
      void klien.invalidateQueries({ queryKey: kunciDokumen.detail(userId, dokumenId) });
    }, [klien, userId, dokumenId]),
  );

  if (q.isPending) {
    return (
      <Screen edges={['bottom']}>
        <View
          accessibilityLabel="Memuat dokumen"
          accessibilityLiveRegion="polite"
          style={styles.gap}
        >
          <Skeleton style={styles.kerangkaJudul} />
          <Skeleton style={styles.kerangkaInfo} />
          <Skeleton style={styles.kerangkaHalaman} />
        </View>
      </Screen>
    );
  }
  if (q.isError) {
    const hilang = (q.error as { kind?: string }).kind === 'tidakada';
    return (
      <Screen edges={['bottom']}>
        {hilang ? (
          <EmptyState
            icon="document-outline"
            title="Dokumen tidak ditemukan"
            description="Dokumen ini mungkin sudah dihapus."
            actionLabel="Kembali"
            onAction={keluar}
          />
        ) : (
          <View style={styles.gap}>
            <Banner message={pesanGalat(q.error, 'Dokumen belum bisa dimuat.')} />
            <Button title="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
          </View>
        )}
      </Screen>
    );
  }

  const dokumen = q.data;
  const halaman = dokumen.halaman;
  const jumlah = halaman.length;
  const tinggi = lebar > 0 ? Math.round(lebar * RASIO_HALAMAN) : 0;

  function keluar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

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
    setIndeks(ke);
  };

  const bukaGantiNama = () => {
    ubah.reset();
    setGalatJudul(null);
    setJudulBaru(dokumen.judul);
    setDialog('nama');
  };

  const simpanNama = () => {
    const cek = judulSchema.safeParse(judulBaru);
    if (!cek.success) {
      setGalatJudul(cek.error.issues[0]?.message ?? 'Judul tidak valid');
      return;
    }
    if (cek.data === dokumen.judul) {
      setDialog(null);
      return;
    }
    ubah.mutate({ dokumenId, judul: cek.data }, { onSuccess: () => setDialog(null) });
  };

  const bukaHapus = () => {
    hapus.reset();
    setDialog('hapus');
  };

  const konfirmasiHapus = () => {
    hapus.mutate(dokumenId, {
      onSuccess: () => {
        setDialog(null);
        keluar();
      },
    });
  };

  const halamanAktif = halaman[Math.min(indeks, Math.max(0, jumlah - 1))];

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.atas}>
        <Text accessibilityRole="header" style={styles.judul}>
          {dokumen.judul}
        </Text>
        <Text style={styles.info}>
          {labelHalaman(jumlah)} · {formatTanggal(dokumen.dibuatPada)}
        </Text>
        <LabelStatus status={dokumen.status} />
      </View>

      {jumlah === 0 ? (
        <EmptyState
          icon="images-outline"
          title="Belum ada halaman"
          description="Dokumen ini belum punya halaman tersimpan."
        />
      ) : (
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
                    accessibilityLabel={`Halaman ${item.urutan} dari ${dokumen.judul}`}
                    style={styles.halaman}
                  />
                </View>
              )}
            />
          ) : null}
        </View>
      )}

      {jumlah > 0 ? (
        <View style={styles.navigasi}>
          <IconButton
            icon="chevron-back"
            label="Halaman sebelumnya"
            onPress={() => geser(indeks - 1)}
            disabled={indeks <= 0}
          />
          <Text accessibilityLiveRegion="polite" style={styles.penanda}>
            Halaman {Math.min(indeks, jumlah - 1) + 1} dari {jumlah}
          </Text>
          <IconButton
            icon="chevron-forward"
            label="Halaman berikutnya"
            onPress={() => geser(indeks + 1)}
            disabled={indeks >= jumlah - 1}
          />
        </View>
      ) : null}

      {halamanAktif ? (
        <Button
          title="Percantik halaman ini"
          variant="secondary"
          fullWidth
          onPress={() =>
            router.push({ pathname: '/editor/[halamanId]', params: { halamanId: halamanAktif.id } })
          }
        />
      ) : null}

      <View style={styles.aksi}>
        <Button title="Ganti nama" variant="secondary" onPress={bukaGantiNama} />
        <Button title="Hapus dokumen" variant="danger" onPress={bukaHapus} />
      </View>

      <Dialog
        visible={dialog === 'nama'}
        title="Ganti nama dokumen"
        confirmLabel="Simpan"
        onConfirm={simpanNama}
        onCancel={() => setDialog(null)}
        busy={ubah.isPending}
        error={ubah.isError ? pesanGalat(ubah.error) : null}
      >
        <TextField
          label="Judul dokumen"
          value={judulBaru}
          onChangeText={(t) => {
            setJudulBaru(t);
            setGalatJudul(null);
          }}
          error={galatJudul ?? undefined}
          maxLength={120}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={simpanNama}
        />
      </Dialog>

      <Dialog
        visible={dialog === 'hapus'}
        title="Hapus dokumen ini?"
        message={`"${dokumen.judul}" beserta ${labelHalaman(jumlah)}-nya akan dihapus permanen, termasuk file di penyimpanan. Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        destructive
        onConfirm={konfirmasiHapus}
        onCancel={() => setDialog(null)}
        busy={hapus.isPending}
        error={hapus.isError ? pesanGalat(hapus.error) : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  atas: { gap: spacing.xs, alignItems: 'flex-start' },
  judul: { ...typography.heading, color: colors.text },
  info: { ...typography.caption, color: colors.textMuted },
  pager: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.border,
  },
  halaman: { width: '100%', height: '100%' },
  navigasi: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  penanda: { ...typography.bodyStrong, color: colors.text },
  aksi: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  kerangkaJudul: { height: 24, width: '60%' },
  kerangkaInfo: { height: 16, width: '40%' },
  kerangkaHalaman: { height: 360, borderRadius: radius.lg },
});