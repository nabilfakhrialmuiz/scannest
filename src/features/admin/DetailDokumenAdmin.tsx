import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Dialog, EmptyState, Screen, Skeleton } from '@/components';
import { formatTanggal, labelHalaman } from '@/features/dokumen/daftar';
import { LabelStatus } from '@/features/dokumen/KartuDokumen';
import { PagerHalaman } from '@/features/dokumen/PagerHalaman';
import { colors, radius, spacing, typography } from '@/theme';

import { namaTampil } from './daftar';
import { pesanGalat } from './galat';
import { useDetailDokumenAdmin, useHapusDokumenAdmin } from './hooks';

// Lihat dan hapus satu dokumen milik siapa pun (tugas 8.5). Admin hanya membaca: tidak ada
// ganti nama atau editor di sini; satu-satunya perubahan adalah menghapus lewat Edge Function.
export function DetailDokumenAdmin({ adminId, dokumenId }: { adminId: string; dokumenId: string }) {
  const router = useRouter();
  const q = useDetailDokumenAdmin(adminId, dokumenId);
  const hapus = useHapusDokumenAdmin(adminId);
  const [dialog, setDialog] = useState(false);

  const keluar = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/admin/dokumen');
  };

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
  const jumlah = dokumen.halaman.length;
  const pemilik = dokumen.pemilik ? namaTampil(dokumen.pemilik) : 'pemilik tidak dikenal';

  const konfirmasi = () => {
    hapus.mutate(dokumenId, {
      onSuccess: () => {
        setDialog(false);
        keluar();
      },
    });
  };

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.atas}>
        <Text accessibilityRole="header" style={styles.judul}>
          {dokumen.judul}
        </Text>
        <Text style={styles.info}>
          Milik {pemilik}
          {dokumen.pemilik?.email && dokumen.pemilik.nama ? ` (${dokumen.pemilik.email})` : ''}
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
        <PagerHalaman halaman={dokumen.halaman} judul={dokumen.judul} />
      )}

      <View style={styles.aksi}>
        <Button
          title="Hapus dokumen"
          variant="danger"
          onPress={() => {
            hapus.reset();
            setDialog(true);
          }}
        />
      </View>

      <Dialog
        visible={dialog}
        title="Hapus dokumen ini?"
        message={`"${dokumen.judul}" milik ${pemilik} beserta ${labelHalaman(jumlah)}-nya akan dihapus permanen, termasuk file di penyimpanan. Aksi ini dicatat di log aktivitas dan tidak bisa dibatalkan.`}
        confirmLabel="Hapus"
        destructive
        onConfirm={konfirmasi}
        onCancel={() => setDialog(false)}
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
  aksi: { flexDirection: 'row', justifyContent: 'center' },
  kerangkaJudul: { height: 24, width: '60%' },
  kerangkaInfo: { height: 16, width: '40%' },
  kerangkaHalaman: { height: 360, borderRadius: radius.lg },
});
