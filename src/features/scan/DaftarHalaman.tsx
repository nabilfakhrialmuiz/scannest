import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Card, IconButton, Screen, ScreenHeader, TextField } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import type { HalamanScan } from './ScanSessionProvider';
import { HALAMAN_MAKS } from './ukuran';

type DaftarHalamanProps = {
  pages: HalamanScan[];
  isFull: boolean;
  /** true setelah penyimpanan dimulai: urutan dikunci dan halaman tersimpan tidak bisa dihapus. */
  isLocked: boolean;
  judul: string;
  onJudulChange: (judul: string) => void;
  onTambah: () => void;
  onHapus: (id: string) => void;
  onGeser: (id: string, direction: -1 | 1) => void;
  onMulaiUlang: () => void;
  /** Setelah tersimpan: buka tab Percantik (Fase 6). */
  onPercantik: () => void;
  /** Penyimpanan (tugas 5.6): unggah ke Cloudinary lalu catat ke database. */
  onSimpan: () => void;
  menyimpan: boolean;
  /** Halaman yang belum tersimpan. */
  sisa: number;
  /** true bila semua halaman sudah tersimpan. */
  selesai: boolean;
  galat: string | null;
};

// Konfirmasi dibuat inline (bukan Alert) supaya konsisten di semua platform dan bisa diuji.
type Konfirmasi = { jenis: 'halaman'; id: string } | { jenis: 'sesi' } | null;

// Status satu halaman: teks selalu ada (tidak hanya warna) agar jelas bagi semua pengguna.
function Status({ page }: { page: HalamanScan }) {
  switch (page.status) {
    case 'baru':
      return <Text style={styles.ukuran}>Menunggu disimpan</Text>;
    case 'mengunggah':
      return (
        <View style={styles.statusBlok}>
          <Text style={styles.statusTeks}>Mengunggah {Math.round(page.progress * 100)}%</Text>
          <View style={styles.bar} accessibilityRole="progressbar">
            <View style={[styles.barIsi, { width: `${Math.round(page.progress * 100)}%` }]} />
          </View>
        </View>
      );
    case 'diunggah':
      return (
        <Text style={page.galat ? styles.statusGalat : styles.statusTeks}>
          {page.galat ?? 'Terunggah, menyimpan data...'}
        </Text>
      );
    case 'tersimpan':
      return (
        <View style={styles.statusBaris}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          <Text style={styles.statusTeks}>Tersimpan</Text>
        </View>
      );
    case 'gagal':
      return <Text style={styles.statusGalat}>{page.galat ?? 'Gagal disimpan.'}</Text>;
  }
}

export function DaftarHalaman({
  pages,
  isFull,
  isLocked,
  judul,
  onJudulChange,
  onTambah,
  onHapus,
  onGeser,
  onMulaiUlang,
  onPercantik,
  onSimpan,
  menyimpan,
  sisa,
  selesai,
  galat,
}: DaftarHalamanProps) {
  const [konfirmasi, setKonfirmasi] = useState<Konfirmasi>(null);
  const sudahMulai = pages.some((p) => p.status !== 'baru');

  return (
    <Screen scroll avoidKeyboard>
      <ScreenHeader title="Halaman scan" subtitle={`${pages.length} halaman dalam sesi ini`} />

      {selesai ? (
        <Banner
          variant="info"
          message="Dokumen tersimpan. Semua halaman sudah diunggah ke Cloudinary dan tercatat di database."
        />
      ) : null}
      {isFull && !selesai ? (
        <Banner
          variant="info"
          message={`Sesi sudah berisi ${HALAMAN_MAKS} halaman, batas maksimum.`}
        />
      ) : null}
      {galat ? <Banner message={galat} /> : null}

      {selesai ? (
        <>
          <Button title="Percantik foto" fullWidth onPress={onPercantik} />
          <Button title="Mulai sesi baru" variant="secondary" fullWidth onPress={onMulaiUlang} />
        </>
      ) : (
        <>
          <TextField
            label="Judul dokumen"
            value={judul}
            onChangeText={onJudulChange}
            editable={!menyimpan && !isLocked}
            maxLength={120}
            returnKeyType="done"
            helper={isLocked ? 'Judul dikunci setelah penyimpanan dimulai.' : undefined}
          />
          <Button
            title={sudahMulai ? `Coba lagi (${sisa} halaman)` : 'Simpan dokumen'}
            fullWidth
            loading={menyimpan}
            onPress={onSimpan}
          />
          <Button
            title="Tambah halaman"
            variant="secondary"
            fullWidth
            disabled={isFull || menyimpan}
            onPress={onTambah}
          />
        </>
      )}

      {pages.map((page, index) => {
        const menghapus = konfirmasi?.jenis === 'halaman' && konfirmasi.id === page.id;
        const bolehHapus = page.status !== 'tersimpan' && page.status !== 'mengunggah';
        return (
          <Card key={page.id}>
            <View style={styles.baris}>
              <Image
                source={{ uri: page.uri }}
                style={styles.thumb}
                contentFit="cover"
                accessibilityLabel={`Gambar mini halaman ${index + 1}`}
              />
              <View style={styles.teks}>
                <Text style={styles.judul}>Halaman {index + 1}</Text>
                <Text style={styles.ukuran}>
                  {page.width} × {page.height} px
                </Text>
                <Status page={page} />
              </View>
            </View>

            {selesai ? null : menghapus ? (
              <View style={styles.konfirmasi}>
                <Text style={styles.tanya}>Hapus halaman ini?</Text>
                <View style={styles.barisTombol}>
                  <View style={styles.tombol}>
                    <Button
                      title="Batal"
                      variant="secondary"
                      fullWidth
                      onPress={() => setKonfirmasi(null)}
                    />
                  </View>
                  <View style={styles.tombol}>
                    <Button
                      title="Hapus"
                      variant="danger"
                      fullWidth
                      onPress={() => {
                        onHapus(page.id);
                        setKonfirmasi(null);
                      }}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.aksi}>
                <IconButton
                  icon="arrow-up"
                  label={`Pindahkan halaman ${index + 1} ke atas`}
                  disabled={index === 0 || isLocked || menyimpan}
                  onPress={() => onGeser(page.id, -1)}
                />
                <IconButton
                  icon="arrow-down"
                  label={`Pindahkan halaman ${index + 1} ke bawah`}
                  disabled={index === pages.length - 1 || isLocked || menyimpan}
                  onPress={() => onGeser(page.id, 1)}
                />
                <IconButton
                  icon="trash-outline"
                  label={`Hapus halaman ${index + 1}`}
                  tone="danger"
                  disabled={!bolehHapus || menyimpan}
                  onPress={() => setKonfirmasi({ jenis: 'halaman', id: page.id })}
                />
              </View>
            )}
          </Card>
        );
      })}

      {selesai ? null : (
        <Card>
          <Text style={styles.catatan}>
            {isLocked
              ? 'Penyimpanan sudah dimulai: urutan halaman dikunci dan halaman yang sudah tersimpan tidak bisa dihapus dari sini.'
              : 'Halaman ini baru ada di HP. Tekan Simpan dokumen untuk mengunggahnya ke Cloudinary dan mencatatnya ke akunmu. Sesi hilang bila aplikasi ditutup paksa, jadi simpan setelah selesai memotret.'}
          </Text>
          {konfirmasi?.jenis === 'sesi' ? (
            <View style={styles.konfirmasi}>
              <Text style={styles.tanya}>
                {isLocked
                  ? 'Mulai sesi baru? Halaman yang sudah tersimpan tetap ada di akunmu.'
                  : `Buang semua ${pages.length} halaman?`}
              </Text>
              <View style={styles.barisTombol}>
                <View style={styles.tombol}>
                  <Button
                    title="Batal"
                    variant="secondary"
                    fullWidth
                    onPress={() => setKonfirmasi(null)}
                  />
                </View>
                <View style={styles.tombol}>
                  <Button
                    title={isLocked ? 'Mulai baru' : 'Buang semua'}
                    variant="danger"
                    fullWidth
                    onPress={() => {
                      onMulaiUlang();
                      setKonfirmasi(null);
                    }}
                  />
                </View>
              </View>
            </View>
          ) : (
            <Button
              title="Mulai sesi baru"
              variant="ghost"
              disabled={menyimpan}
              onPress={() => setKonfirmasi({ jenis: 'sesi' })}
            />
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  baris: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  thumb: {
    width: 64,
    height: 88,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  teks: { flex: 1, gap: spacing.xs },
  judul: { ...typography.bodyStrong, color: colors.text },
  ukuran: { ...typography.caption, color: colors.textMuted },
  statusBlok: { gap: spacing.xs },
  statusBaris: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  statusTeks: { ...typography.caption, color: colors.text },
  statusGalat: { ...typography.caption, color: colors.danger },
  bar: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  barIsi: { height: 6, backgroundColor: colors.primary },
  aksi: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  konfirmasi: { gap: spacing.sm },
  tanya: { ...typography.bodyStrong, color: colors.text },
  barisTombol: { flexDirection: 'row', gap: spacing.md },
  tombol: { flex: 1 },
  catatan: { ...typography.body, color: colors.textMuted },
});

