import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Banner,
  Button,
  Card,
  EmptyState,
  LoadingScreen,
  Screen,
  ScreenHeader,
} from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import { GalatEditor, muatDokumenPercantik } from './api';
import { buildCloudinaryUrl } from './cloudinaryUrl';
import { EFEK_BAWAAN } from './efek';
import type { DokumenPercantik, HalamanRingkas } from './skema';

const SISI_GAMBAR_MINI = 240;

type Keadaan =
  | { status: 'memuat' }
  | { status: 'siap'; dokumen: DokumenPercantik[] }
  | { status: 'galat'; pesan: string };

// Tab Percantik (tugas 6.10): dokumen terbaru dengan halamannya. Halaman yang belum punya efek
// ditandai "Belum"; mengetuk halaman mana pun membuka editor (yang sudah dipercantik dimuat ulang).
export function DaftarPercantik() {
  const router = useRouter();
  const [keadaan, setKeadaan] = useState<Keadaan>({ status: 'memuat' });

  const muat = useCallback(async () => {
    try {
      const dokumen = await muatDokumenPercantik();
      setKeadaan({ status: 'siap', dokumen });
    } catch (galat) {
      setKeadaan({
        status: 'galat',
        pesan: galat instanceof GalatEditor ? galat.message : 'Daftar belum bisa dimuat.',
      });
    }
  }, []);

  // Dimuat ulang tiap tab ini dibuka lagi, supaya hasil simpan dari editor langsung terlihat.
  useFocusEffect(
    useCallback(() => {
      void muat();
    }, [muat]),
  );

  const bukaEditor = (halamanId: string) =>
    router.push({ pathname: '/editor/[halamanId]', params: { halamanId } });

  if (keadaan.status === 'memuat') {
    return <LoadingScreen message="Memuat dokumen..." />;
  }

  const perlu = keadaan.status === 'siap' ? keadaan.dokumen.filter((d) => d.belum > 0) : [];
  const selesai = keadaan.status === 'siap' ? keadaan.dokumen.filter((d) => d.belum === 0) : [];

  return (
    <Screen scroll>
      <ScreenHeader title="Percantik" subtitle="Crop, putar, dan beri efek pada halaman scan." />

      {keadaan.status === 'galat' ? (
        <>
          <Banner message={keadaan.pesan} />
          <Button
            title="Coba lagi"
            fullWidth
            onPress={() => {
              setKeadaan({ status: 'memuat' });
              void muat();
            }}
          />
        </>
      ) : null}

      {keadaan.status === 'siap' && keadaan.dokumen.length === 0 ? (
        <EmptyState
          icon="images-outline"
          title="Belum ada halaman"
          description="Scan dan simpan dokumen dulu, lalu halamannya muncul di sini untuk dipercantik."
          actionLabel="Mulai scan"
          onAction={() => router.push('/kamera')}
        />
      ) : null}

      {perlu.length > 0 ? <Text style={styles.bagian}>Perlu dipercantik</Text> : null}
      {perlu.map((dokumen) => (
        <KartuDokumen key={dokumen.id} dokumen={dokumen} onBuka={bukaEditor} />
      ))}

      {selesai.length > 0 ? <Text style={styles.bagian}>Sudah dipercantik</Text> : null}
      {selesai.map((dokumen) => (
        <KartuDokumen key={dokumen.id} dokumen={dokumen} onBuka={bukaEditor} />
      ))}
    </Screen>
  );
}

function KartuDokumen({
  dokumen,
  onBuka,
}: {
  dokumen: DokumenPercantik;
  onBuka: (halamanId: string) => void;
}) {
  return (
    <Card>
      <Text style={styles.judul}>{dokumen.judul}</Text>
      <Text style={styles.ringkas}>
        {dokumen.belum === 0
          ? `Semua ${dokumen.halaman.length} halaman sudah dipercantik`
          : `${dokumen.belum} dari ${dokumen.halaman.length} halaman belum dipercantik`}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.baris}
      >
        {dokumen.halaman.map((halaman) => (
          <KartuHalaman
            key={halaman.id}
            halaman={halaman}
            judul={dokumen.judul}
            onPress={() => onBuka(halaman.id)}
          />
        ))}
      </ScrollView>
    </Card>
  );
}

function KartuHalaman({
  halaman,
  judul,
  onPress,
}: {
  halaman: HalamanRingkas;
  judul: string;
  onPress: () => void;
}) {
  const sudah = halaman.efek !== null;
  // Gambar mini mengikuti efek tersimpan; bila alamatnya tak dikenali, pakai foto asli apa adanya.
  const uri =
    buildCloudinaryUrl(halaman.urlAsli, halaman.efek ?? EFEK_BAWAAN, {
      sisiMaks: SISI_GAMBAR_MINI,
    }) ?? halaman.urlAsli;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Halaman ${halaman.urutan} dari ${judul}, ${sudah ? 'sudah' : 'belum'} dipercantik`}
      onPress={onPress}
      style={({ pressed }) => [styles.halaman, pressed && styles.ditekan]}
    >
      <Image source={{ uri }} style={styles.gambarMini} contentFit="cover" />
      <Text style={styles.nomor}>Halaman {halaman.urutan}</Text>
      <View style={[styles.lencana, sudah ? styles.lencanaSudah : styles.lencanaBelum]}>
        <Text
          style={[styles.lencanaTeks, sudah ? styles.lencanaTeksSudah : styles.lencanaTeksBelum]}
        >
          {sudah ? 'Selesai' : 'Belum'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bagian: { ...typography.heading, color: colors.text },
  judul: { ...typography.bodyStrong, color: colors.text },
  ringkas: { ...typography.caption, color: colors.textMuted },
  baris: { gap: spacing.md, paddingVertical: spacing.sm },
  halaman: { width: 96, gap: spacing.xs, alignItems: 'flex-start' },
  ditekan: { opacity: 0.85 },
  gambarMini: {
    width: 96,
    height: 128,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  nomor: { ...typography.caption, color: colors.text },
  lencana: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  lencanaSudah: { backgroundColor: colors.primarySoft },
  lencanaBelum: { backgroundColor: colors.dangerSoft },
  lencanaTeks: { ...typography.caption },
  lencanaTeksSudah: { color: colors.text },
  lencanaTeksBelum: { color: colors.text },
});
