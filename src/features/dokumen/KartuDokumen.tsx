import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Card, Skeleton } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import { LABEL_STATUS, formatTanggal, labelHalaman } from './daftar';
import { urlMini } from './gambar';
import type { DokumenRingkas, StatusDokumen } from './skema';

const SISI_MINI = 72;

export function LabelStatus({ status }: { status: StatusDokumen }) {
  const selesai = status === 'selesai';
  return (
    <View style={[styles.lencana, selesai ? styles.lencanaSelesai : styles.lencanaDraft]}>
      <Text style={[styles.lencanaTeks, { color: selesai ? colors.primary : colors.text }]}>
        {LABEL_STATUS[status]}
      </Text>
    </View>
  );
}

// Satu baris dokumen di daftar: gambar mini, judul, status, jumlah halaman, tanggal.
export function KartuDokumen({
  dokumen,
  onPress,
}: {
  dokumen: DokumenRingkas;
  onPress: () => void;
}) {
  const mini = dokumen.urlSampul ? (urlMini(dokumen.urlSampul) ?? dokumen.urlSampul) : null;
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${dokumen.judul}, ${LABEL_STATUS[dokumen.status]}, ${labelHalaman(dokumen.jumlahHalaman)}`}
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
        <Text style={styles.info}>
          {labelHalaman(dokumen.jumlahHalaman)} · {formatTanggal(dokumen.dibuatPada)}
        </Text>
        <LabelStatus status={dokumen.status} />
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Card>
  );
}

/** Kerangka kartu selagi daftar dimuat. */
export function KartuDokumenKerangka() {
  return (
    <Card style={styles.kartu}>
      <Skeleton style={styles.mini} />
      <View style={styles.teks}>
        <Skeleton style={styles.kerangkaJudul} />
        <Skeleton style={styles.kerangkaInfo} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
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
  lencana: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill },
  lencanaDraft: { backgroundColor: colors.border },
  lencanaSelesai: { backgroundColor: colors.primarySoft },
  lencanaTeks: { ...typography.caption },
  kerangkaJudul: { height: 18, width: '70%' },
  kerangkaInfo: { height: 14, width: '45%' },
});