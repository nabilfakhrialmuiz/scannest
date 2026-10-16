import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Banner, Button, Screen } from '@/components';
import { colors, radius, spacing } from '@/theme';

import type { FotoMentah } from './normalisasi';

type TinjauFotoProps = {
  foto: FotoMentah;
  /** true selagi foto diperkecil dan disimpan ulang. */
  memproses: boolean;
  galat: string | null;
  onPakai: () => void;
  onUlang: () => void;
};

// Layar tinjau: pengguna menilai ketajaman dan keterbacaan sebelum foto masuk sesi.
export function TinjauFoto({ foto, memproses, galat, onPakai, onUlang }: TinjauFotoProps) {
  return (
    <Screen padded={false}>
      <View style={styles.frame}>
        <Image
          source={{ uri: foto.uri }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          accessibilityLabel="Pratinjau foto dokumen"
        />
      </View>
      {galat ? (
        <View style={styles.banner}>
          <Banner message={galat} />
        </View>
      ) : null}
      <View style={styles.aksi}>
        <View style={styles.tombol}>
          <Button
            title="Ulang"
            variant="secondary"
            fullWidth
            disabled={memproses}
            onPress={onUlang}
          />
        </View>
        <View style={styles.tombol}>
          <Button title="Pakai foto" fullWidth loading={memproses} onPress={onPakai} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.scrim,
  },
  banner: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  aksi: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, paddingTop: spacing.sm },
  tombol: { flex: 1 },
});
