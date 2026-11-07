import { useFocusEffect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Dialog, EmptyState, Screen, Skeleton, TextField } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import { formatTanggal, labelHalaman } from './daftar';
import { pesanGalat } from './galat';
import { kunciDokumen, useDetailDokumen, useHapusDokumen, useUbahJudul } from './hooks';
import { LabelStatus } from './KartuDokumen';
import { judulSchema } from './judul';
import { PagerHalaman } from './PagerHalaman';

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
  const [indeks, setIndeks] = useState(0);

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

  function keluar() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

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
        <PagerHalaman halaman={halaman} judul={dokumen.judul} onIndeksBerubah={setIndeks} />
      )}

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
  aksi: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  kerangkaJudul: { height: 24, width: '60%' },
  kerangkaInfo: { height: 16, width: '40%' },
  kerangkaHalaman: { height: 360, borderRadius: radius.lg },
});
