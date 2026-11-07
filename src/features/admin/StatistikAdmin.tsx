import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Card, Skeleton } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import { formatAngka, formatUkuran } from './daftar';
import { pesanGalat } from './galat';
import { useStatistik } from './hooks';

type NamaIkon = ComponentProps<typeof Ionicons>['name'];

function KartuAngka({
  ikon,
  label,
  nilai,
  catatan,
}: {
  ikon: NamaIkon;
  label: string;
  nilai: string;
  catatan?: string;
}) {
  return (
    <Card accessible style={styles.kartuAngka} accessibilityLabel={`${label}: ${nilai}`}>
      <View style={styles.ikon}>
        <Ionicons name={ikon} size={20} color={colors.primary} />
      </View>
      <Text style={styles.nilai}>{nilai}</Text>
      <Text style={styles.label}>{label}</Text>
      {catatan ? <Text style={styles.catatan}>{catatan}</Text> : null}
    </Card>
  );
}

function PintasanAdmin({
  ikon,
  judul,
  deskripsi,
  onPress,
}: {
  ikon: NamaIkon;
  judul: string;
  deskripsi: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} accessibilityLabel={judul} style={styles.pintasan}>
      <View style={styles.ikon}>
        <Ionicons name={ikon} size={20} color={colors.primary} />
      </View>
      <View style={styles.teksPintasan}>
        <Text style={styles.judulPintasan}>{judul}</Text>
        <Text style={styles.deskripsi}>{deskripsi}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Card>
  );
}

// Layar utama panel admin (tugas 8.3): angka ringkasan dan pintasan ke tiga layar kelola.
export function StatistikAdmin({ adminId }: { adminId: string }) {
  const router = useRouter();
  const q = useStatistik(adminId);
  const [menyegarkan, setMenyegarkan] = useState(false);

  const tarikSegar = async () => {
    setMenyegarkan(true);
    try {
      await q.refetch();
    } finally {
      setMenyegarkan(false);
    }
  };

  let ringkasan;
  if (q.isPending) {
    ringkasan = (
      <View
        accessibilityLabel="Memuat statistik"
        accessibilityLiveRegion="polite"
        style={styles.grid}
      >
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} style={styles.kartuAngka}>
            <Skeleton style={styles.kerangkaNilai} />
            <Skeleton style={styles.kerangkaLabel} />
          </Card>
        ))}
      </View>
    );
  } else if (q.isError) {
    ringkasan = (
      <View style={styles.gap}>
        <Banner message={pesanGalat(q.error, 'Statistik belum bisa dimuat.')} />
        <Button title="Coba lagi" variant="secondary" onPress={() => void q.refetch()} />
      </View>
    );
  } else {
    const s = q.data;
    ringkasan = (
      <View style={styles.grid}>
        <KartuAngka
          ikon="people-outline"
          label="Pengguna"
          nilai={formatAngka(s.penggunaTotal)}
          catatan={`${formatAngka(s.penggunaAktif)} aktif`}
        />
        <KartuAngka
          ikon="document-text-outline"
          label="Dokumen"
          nilai={formatAngka(s.dokumenTotal)}
        />
        <KartuAngka ikon="images-outline" label="Halaman" nilai={formatAngka(s.halamanTotal)} />
        <KartuAngka
          ikon="cloud-outline"
          label="Penyimpanan"
          nilai={formatUkuran(s.ukuranByte)}
          catatan="Total ukuran semua halaman"
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.isi}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={menyegarkan}
          onRefresh={() => void tarikSegar()}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Text accessibilityRole="header" style={styles.bagian}>
        Ringkasan
      </Text>
      {ringkasan}

      <Text accessibilityRole="header" style={styles.bagian}>
        Kelola
      </Text>
      <PintasanAdmin
        ikon="people-outline"
        judul="Pengguna"
        deskripsi="Cari, nonaktifkan, aktifkan, atau hapus akun."
        onPress={() => router.push('/admin/pengguna')}
      />
      <PintasanAdmin
        ikon="folder-open-outline"
        judul="Dokumen"
        deskripsi="Tinjau semua dokumen dari seluruh pengguna."
        onPress={() => router.push('/admin/dokumen')}
      />
      <PintasanAdmin
        ikon="time-outline"
        judul="Log aktivitas"
        deskripsi="Riwayat aksi admin, bisa disaring."
        onPress={() => router.push('/admin/log')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  isi: { padding: spacing.lg, gap: spacing.md },
  gap: { gap: spacing.md },
  bagian: { ...typography.heading, color: colors.text, marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  kartuAngka: { flexGrow: 1, flexBasis: '45%', minWidth: 140 },
  ikon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nilai: { ...typography.title, color: colors.text },
  label: { ...typography.bodyStrong, color: colors.text },
  catatan: { ...typography.caption, color: colors.textMuted },
  pintasan: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  teksPintasan: { flex: 1, gap: 2 },
  judulPintasan: { ...typography.bodyStrong, color: colors.text },
  deskripsi: { ...typography.caption, color: colors.textMuted },
  kerangkaNilai: { height: 30, width: '50%' },
  kerangkaLabel: { height: 14, width: '60%' },
});
