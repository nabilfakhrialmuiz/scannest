import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type FlashMode } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { Banner, IconButton, LoadingScreen, Screen } from '@/components';
import { colors, minTouchSize, radius, spacing, typography } from '@/theme';

import { IzinKamera } from './IzinKamera';
import type { FotoMentah } from './normalisasi';

type KameraScanProps = {
  /** false saat layar tidak sedang dilihat: kamera dilepas (hanya satu pratinjau boleh aktif). */
  aktif: boolean;
  flash: FlashMode;
  onFlashChange: (flash: FlashMode) => void;
  grid: boolean;
  onGridChange: (grid: boolean) => void;
  jumlahHalaman: number;
  /** true: sesi sudah penuh, tombol jepret dinonaktifkan. */
  penuh: boolean;
  onFoto: (foto: FotoMentah) => void;
  /** Pindah ke daftar halaman sesi. */
  onLihatDaftar: () => void;
};

const urutanFlash: FlashMode[] = ['off', 'on', 'auto'];
const labelFlash: Record<FlashMode, string> = {
  off: 'Flash mati',
  on: 'Flash hidup',
  auto: 'Flash otomatis',
};
const ikonFlash = { off: 'flash-off', on: 'flash', auto: 'flash-outline' } as const;

export function KameraScan(props: KameraScanProps) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const granted = permission?.granted ?? false;

  // Kembali dari pengaturan HP: cek ulang izin tanpa menunggu pengguna menekan apa pun.
  useEffect(() => {
    if (granted) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void getPermission();
    });
    return () => sub.remove();
  }, [granted, getPermission]);

  if (!permission) return <LoadingScreen message="Menyiapkan kamera..." />;
  if (!permission.granted) {
    return <IzinKamera permission={permission} onRequest={() => void requestPermission()} />;
  }
  return <Pratinjau {...props} />;
}

// Dipasang hanya saat izin sudah ada; state `siap` otomatis kembali false tiap kamera dipasang ulang.
function Pratinjau({
  aktif,
  flash,
  onFlashChange,
  grid,
  onGridChange,
  jumlahHalaman,
  penuh,
  onFoto,
  onLihatDaftar,
}: KameraScanProps) {
  const cameraRef = useRef<CameraView>(null);
  const [siap, setSiap] = useState(false);
  const [mengambil, setMengambil] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const ganti = () => {
    const berikut = urutanFlash[(urutanFlash.indexOf(flash) + 1) % urutanFlash.length];
    onFlashChange(berikut);
  };

  const jepret = async () => {
    // Tunggu kamera siap dan cegah dua jepretan bersamaan akibat ketukan ganda.
    if (!siap || mengambil || penuh) return;
    setMengambil(true);
    setGalat(null);
    try {
      // skipProcessing sengaja tidak diisi: tanpa itu expo-camera memutar piksel sesuai
      // orientasi perangkat, sehingga foto portrait dan landscape tegak.
      const foto = await cameraRef.current?.takePictureAsync({ quality: 1, exif: false });
      if (!foto) throw new Error('Kamera tidak mengembalikan foto.');
      onFoto({ uri: foto.uri, width: foto.width, height: foto.height });
    } catch {
      setGalat('Foto belum berhasil diambil. Coba jepret lagi.');
    } finally {
      setMengambil(false);
    }
  };

  return (
    <Screen padded={false}>
      <View style={styles.preview}>
        {aktif ? (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            flash={flash}
            onCameraReady={() => setSiap(true)}
            onMountError={() =>
              setGalat('Kamera tidak bisa dibuka. Tutup aplikasi lain yang memakai kamera.')
            }
          />
        ) : null}

        {grid ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={[styles.garisH, { top: '33.33%' }]} />
            <View style={[styles.garisH, { top: '66.66%' }]} />
            <View style={[styles.garisV, { left: '33.33%' }]} />
            <View style={[styles.garisV, { left: '66.66%' }]} />
          </View>
        ) : null}

        <View style={styles.atas}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${labelFlash[flash]}. Ketuk untuk mengganti.`}
            onPress={ganti}
            style={styles.pil}
          >
            <Ionicons name={ikonFlash[flash]} size={20} color={colors.onScrim} />
            <Text style={styles.pilTeks}>{labelFlash[flash]}</Text>
          </Pressable>
          <IconButton
            icon={grid ? 'grid' : 'grid-outline'}
            label={grid ? 'Sembunyikan grid' : 'Tampilkan grid'}
            tone="scrim"
            onPress={() => onGridChange(!grid)}
          />
        </View>
      </View>

      {galat ? (
        <View style={styles.banner}>
          <Banner message={galat} />
        </View>
      ) : null}

      <View style={styles.bawah}>
        <View style={styles.sisi}>
          {jumlahHalaman > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Lihat ${jumlahHalaman} halaman`}
              onPress={onLihatDaftar}
              style={styles.hitung}
            >
              <Ionicons name="images-outline" size={22} color={colors.primary} />
              <Text style={styles.hitungTeks}>{jumlahHalaman}</Text>
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={penuh ? 'Sesi penuh' : 'Jepret'}
          accessibilityState={{ disabled: !siap || mengambil || penuh, busy: mengambil }}
          disabled={!siap || mengambil || penuh}
          onPress={() => void jepret()}
          style={({ pressed }) => [
            styles.jepretLuar,
            (!siap || penuh) && styles.mati,
            pressed && styles.ditekan,
          ]}
        >
          <View style={[styles.jepretDalam, mengambil && styles.jepretProses]} />
        </Pressable>

        <View style={styles.sisi} />
      </View>
    </Screen>
  );
}

const GARIS = 'rgba(255,255,255,0.75)';

const styles = StyleSheet.create({
  preview: {
    flex: 1,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.scrim,
  },
  garisH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: GARIS },
  garisV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: GARIS },
  atas: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pil: {
    minHeight: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.scrim,
  },
  pilTeks: { ...typography.bodyStrong, color: colors.onScrim },
  banner: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  bawah: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  sisi: { width: 72, alignItems: 'flex-start' },
  hitung: {
    minHeight: minTouchSize,
    minWidth: minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  hitungTeks: { ...typography.bodyStrong, color: colors.primary },
  jepretLuar: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jepretDalam: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  jepretProses: { opacity: 0.5 },
  mati: { opacity: 0.4 },
  ditekan: { opacity: 0.85 },
});
