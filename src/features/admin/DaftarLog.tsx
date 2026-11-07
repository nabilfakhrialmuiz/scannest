import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip, EmptyState } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import { LABEL_AKSI, URUTAN_AKSI, formatWaktu, namaTampil, type AksiLog } from './daftar';
import { kunciAdmin, useDaftarAdmin, useDaftarLog } from './hooks';
import { ListaBerhalaman } from './ListaBerhalaman';
import type { LogAdmin } from './skema';

const IKON: Record<AksiLog, ComponentProps<typeof Ionicons>['name']> = {
  nonaktifkan_akun: 'ban-outline',
  aktifkan_akun: 'checkmark-circle-outline',
  hapus_akun: 'person-remove-outline',
  hapus_dokumen: 'trash-outline',
};

function BarisLog({ log }: { log: LogAdmin }) {
  const oleh =
    log.adminId === null
      ? 'akun admin sudah dihapus'
      : namaTampil({ nama: log.namaAdmin, email: log.emailAdmin }, 'admin');
  return (
    <Card
      accessible
      accessibilityLabel={`${LABEL_AKSI[log.aksi]}, oleh ${oleh}, ${formatWaktu(log.waktu)}`}
      style={styles.baris}
    >
      <View style={styles.ikon}>
        <Ionicons name={IKON[log.aksi]} size={20} color={colors.primary} />
      </View>
      <View style={styles.teks}>
        <Text style={styles.aksi}>{LABEL_AKSI[log.aksi]}</Text>
        {log.keterangan ? <Text style={styles.keterangan}>{log.keterangan}</Text> : null}
        <Text style={styles.info}>
          Oleh {oleh} · {formatWaktu(log.waktu)}
        </Text>
      </View>
    </Card>
  );
}

// Log aktivitas (tugas 8.6): aksi admin terbaru lebih dulu, disaring menurut jenis aksi dan admin.
export function DaftarLog({ adminId }: { adminId: string }) {
  const [aksi, setAksi] = useState<AksiLog | null>(null);
  const [filterAdmin, setFilterAdmin] = useState<string | null>(null);
  const q = useDaftarLog(adminId, aksi, filterAdmin);
  const daftarAdmin = useDaftarAdmin(adminId);
  const adaPenyaring = aksi !== null || filterAdmin !== null;

  const kepala = (
    <View style={styles.kepala}>
      <Text style={styles.labelFilter}>Jenis aksi</Text>
      <View style={styles.chip}>
        <Chip label="Semua aksi" selected={aksi === null} onPress={() => setAksi(null)} />
        {URUTAN_AKSI.map((nilai) => (
          <Chip
            key={nilai}
            label={LABEL_AKSI[nilai]}
            selected={aksi === nilai}
            onPress={() => setAksi(nilai)}
          />
        ))}
      </View>
      {daftarAdmin.data && daftarAdmin.data.length > 0 ? (
        <>
          <Text style={styles.labelFilter}>Admin</Text>
          <View style={styles.chip}>
            <Chip
              label="Semua admin"
              selected={filterAdmin === null}
              onPress={() => setFilterAdmin(null)}
            />
            {daftarAdmin.data.map((a) => (
              <Chip
                key={a.id}
                label={namaTampil(a, 'Admin')}
                selected={filterAdmin === a.id}
                onPress={() => setFilterAdmin(a.id)}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );

  const kosong = adaPenyaring ? (
    <EmptyState
      icon="search-outline"
      title="Tidak ada log yang cocok"
      description="Coba ubah jenis aksi atau adminnya."
      actionLabel="Hapus filter"
      onAction={() => {
        setAksi(null);
        setFilterAdmin(null);
      }}
    />
  ) : (
    <EmptyState
      icon="time-outline"
      title="Belum ada aktivitas"
      description="Aksi admin seperti menonaktifkan akun atau menghapus dokumen akan tercatat di sini."
    />
  );

  return (
    <ListaBerhalaman
      q={q}
      kepala={kepala}
      kosong={kosong}
      labelMemuat="Memuat log aktivitas"
      pesanGagalMuat="Log aktivitas belum bisa dimuat."
      kunciSegar={kunciAdmin.semua(adminId)}
      renderItem={(log) => <BarisLog log={log} />}
    />
  );
}

const styles = StyleSheet.create({
  kepala: { gap: spacing.md, marginBottom: spacing.lg },
  labelFilter: { ...typography.bodyStrong, color: colors.text },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  baris: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  ikon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teks: { flex: 1, gap: 2 },
  aksi: { ...typography.bodyStrong, color: colors.text },
  keterangan: { ...typography.body, color: colors.text },
  info: { ...typography.caption, color: colors.textMuted },
});
