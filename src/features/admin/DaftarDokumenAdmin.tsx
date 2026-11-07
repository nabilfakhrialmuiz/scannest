import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Chip, EmptyState, TextField } from '@/components';
import {
  FILTER_STATUS,
  LABEL_FILTER,
  LABEL_STATUS,
  formatTanggal,
  labelHalaman,
  type FilterStatus,
} from '@/features/dokumen/daftar';
import { urlMini } from '@/features/dokumen/gambar';
import { LabelStatus } from '@/features/dokumen/KartuDokumen';
import { useDebouncedValue } from '@/features/editor';
import { colors, radius, spacing, typography } from '@/theme';

import { namaTampil } from './daftar';
import { kunciAdmin, useDaftarDokumenAdmin } from './hooks';
import { ListaBerhalaman } from './ListaBerhalaman';
import type { DokumenAdmin } from './skema';

const SISI_MINI = 72;
const JEDA_CARI_MS = 400;

function KartuDokumenAdmin({ dokumen, onPress }: { dokumen: DokumenAdmin; onPress: () => void }) {
  const mini = dokumen.urlSampul ? (urlMini(dokumen.urlSampul) ?? dokumen.urlSampul) : null;
  const pemilik = namaTampil({ nama: dokumen.namaPemilik, email: dokumen.emailPemilik });
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${dokumen.judul}, milik ${pemilik}, ${LABEL_STATUS[dokumen.status]}, ${labelHalaman(dokumen.jumlahHalaman)}`}
      style={styles.kartu}
    >
      {mini ? (
        <Image
          source={{ uri: mini }}
          contentFit="cover"
          transition={150}
          accessibilityLabel={`Sampul ${dokumen.judul}`}
          style={styles.mini}
        />
      ) : (
        <View style={[styles.mini, styles.miniKosong]}>
          <Ionicons name="document-outline" size={28} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.teks}>
        <Text numberOfLines={2} style={styles.judul}>
          {dokumen.judul}
        </Text>
        <Text numberOfLines={1} style={styles.info}>
          Milik {pemilik}
        </Text>
        <Text style={styles.info}>
          {labelHalaman(dokumen.jumlahHalaman)} · {formatTanggal(dokumen.dibuatPada)}
        </Text>
        <LabelStatus status={dokumen.status} />
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Card>
  );
}

// Tinjau dokumen (tugas 8.5): semua dokumen dari semua pengguna, dicari berdasarkan judul atau
// pemilik, disaring menurut status. Menyentuh kartu membuka layar detail (lihat dan hapus).
export function DaftarDokumenAdmin({ adminId }: { adminId: string }) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<FilterStatus>('semua');
  const kata = useDebouncedValue(input, JEDA_CARI_MS).trim();
  const q = useDaftarDokumenAdmin(adminId, status, kata);
  const adaPenyaring = status !== 'semua' || kata !== '';

  const kepala = (
    <View style={styles.kepala}>
      <TextField
        label="Cari dokumen"
        placeholder="Judul, nama, atau email pemilik"
        value={input}
        onChangeText={setInput}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
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

  const kosong = adaPenyaring ? (
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
  ) : (
    <EmptyState
      icon="document-text-outline"
      title="Belum ada dokumen"
      description="Dokumen yang dibuat pengguna akan muncul di sini."
    />
  );

  return (
    <ListaBerhalaman
      q={q}
      kepala={kepala}
      kosong={kosong}
      labelMemuat="Memuat dokumen"
      pesanGagalMuat="Daftar dokumen belum bisa dimuat."
      kunciSegar={kunciAdmin.semua(adminId)}
      renderItem={(d) => (
        <KartuDokumenAdmin
          dokumen={d}
          onPress={() => router.push({ pathname: '/admin/dokumen/[id]', params: { id: d.id } })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  kepala: { gap: spacing.lg, marginBottom: spacing.lg },
  chip: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  kartu: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  mini: { width: SISI_MINI, height: SISI_MINI, borderRadius: radius.md },
  miniKosong: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teks: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  judul: { ...typography.bodyStrong, color: colors.text },
  info: { ...typography.caption, color: colors.textMuted },
});
