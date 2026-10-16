import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Banner, Button, Card, IconButton, Screen, ScreenHeader } from '@/components';
import { colors, radius, spacing, typography } from '@/theme';

import type { HalamanScan } from './ScanSessionProvider';
import { HALAMAN_MAKS } from './ukuran';

type DaftarHalamanProps = {
  pages: HalamanScan[];
  isFull: boolean;
  onTambah: () => void;
  onHapus: (id: string) => void;
  onGeser: (id: string, direction: -1 | 1) => void;
  onMulaiUlang: () => void;
};

// Konfirmasi dibuat inline (bukan Alert) supaya konsisten di semua platform dan bisa diuji.
type Konfirmasi = { jenis: 'halaman'; id: string } | { jenis: 'sesi' } | null;

export function DaftarHalaman({
  pages,
  isFull,
  onTambah,
  onHapus,
  onGeser,
  onMulaiUlang,
}: DaftarHalamanProps) {
  const [konfirmasi, setKonfirmasi] = useState<Konfirmasi>(null);

  return (
    <Screen scroll>
      <ScreenHeader title="Halaman scan" subtitle={`${pages.length} halaman dalam sesi ini`} />

      {isFull ? (
        <Banner
          variant="info"
          message={`Sesi sudah berisi ${HALAMAN_MAKS} halaman, batas maksimum.`}
        />
      ) : null}

      <Button title="Tambah halaman" fullWidth disabled={isFull} onPress={onTambah} />

      {pages.map((page, index) => {
        const menghapus = konfirmasi?.jenis === 'halaman' && konfirmasi.id === page.id;
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
              </View>
            </View>

            {menghapus ? (
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
                  disabled={index === 0}
                  onPress={() => onGeser(page.id, -1)}
                />
                <IconButton
                  icon="arrow-down"
                  label={`Pindahkan halaman ${index + 1} ke bawah`}
                  disabled={index === pages.length - 1}
                  onPress={() => onGeser(page.id, 1)}
                />
                <IconButton
                  icon="trash-outline"
                  label={`Hapus halaman ${index + 1}`}
                  tone="danger"
                  onPress={() => setKonfirmasi({ jenis: 'halaman', id: page.id })}
                />
              </View>
            )}
          </Card>
        );
      })}

      <Card>
        <Text style={styles.catatan}>
          Halaman ini baru ada di HP. Menyimpannya sebagai dokumen (unggah ke cloud) hadir di Fase
          5.
        </Text>
        {konfirmasi?.jenis === 'sesi' ? (
          <View style={styles.konfirmasi}>
            <Text style={styles.tanya}>Buang semua {pages.length} halaman?</Text>
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
                  title="Buang semua"
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
            onPress={() => setKonfirmasi({ jenis: 'sesi' })}
          />
        )}
      </Card>
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
  aksi: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  konfirmasi: { gap: spacing.sm },
  tanya: { ...typography.bodyStrong, color: colors.text },
  barisTombol: { flexDirection: 'row', gap: spacing.md },
  tombol: { flex: 1 },
  catatan: { ...typography.body, color: colors.textMuted },
});
