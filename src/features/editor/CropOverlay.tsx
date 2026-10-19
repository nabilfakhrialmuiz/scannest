import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type GestureResponderHandlers } from 'react-native';

import { colors, minTouchSize, radius } from '@/theme';

import { geserCrop, masukkanKeFoto, ubahSudut, type Sudut, type Ukuran } from './crop';
import type { CropPiksel } from './efek';

type CropOverlayProps = {
  /** Ukuran foto asli dalam piksel. */
  foto: Ukuran;
  /** Ukuran foto di layar (dp) dan skalanya (dp per piksel foto). */
  tampil: { w: number; h: number; skala: number };
  /** Area crop saat ini, dalam piksel foto. */
  crop: CropPiksel;
  onChange: (crop: CropPiksel) => void;
};

type Sasaran = Sudut | 'badan';

const SUDUT: Sudut[] = ['nw', 'ne', 'sw', 'se'];
const LABEL: Record<Sasaran, string> = {
  badan: 'Geser area crop',
  nw: 'Tarik sudut kiri atas',
  ne: 'Tarik sudut kanan atas',
  sw: 'Tarik sudut kiri bawah',
  se: 'Tarik sudut kanan bawah',
};

const TEPI = minTouchSize / 2;

// Overlay crop 4 sudut (tugas 6.4). Memakai PanResponder bawaan React Native, bukan Gesture
// Handler + Reanimated seperti rencana awal (lihat ROADMAP, keputusan K31): lebih sederhana,
// tanpa konfigurasi worklet, dan hasilnya cukup untuk empat titik tarik.
export function CropOverlay({ foto, tampil, crop, onChange }: CropOverlayProps) {
  // PanResponder dibuat sekali, jadi nilai terbaru dibaca lewat ref.
  const terbaru = useRef({ foto, skala: tampil.skala, crop, onChange });
  useEffect(() => {
    terbaru.current = { foto, skala: tampil.skala, crop, onChange };
  });
  const awal = useRef<CropPiksel>(crop);

  const bikin = (sasaran: Sasaran): GestureResponderHandlers => {
    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        awal.current = terbaru.current.crop;
      },
      onPanResponderMove: (_, gesture) => {
        const { foto: f, skala, onChange: ubah } = terbaru.current;
        if (skala <= 0) return;
        const dx = gesture.dx / skala;
        const dy = gesture.dy / skala;
        const hasil =
          sasaran === 'badan'
            ? geserCrop(awal.current, dx, dy, f)
            : ubahSudut(awal.current, sasaran, dx, dy, f);
        ubah(masukkanKeFoto(hasil, f));
      },
    });
    return responder.panHandlers;
  };
  const [handlers] = useState<Record<Sasaran, GestureResponderHandlers>>(() => ({
    badan: bikin('badan'),
    nw: bikin('nw'),
    ne: bikin('ne'),
    sw: bikin('sw'),
    se: bikin('se'),
  }));

  const s = tampil.skala;
  const kiri = crop.x * s;
  const atas = crop.y * s;
  const lebar = crop.w * s;
  const tinggi = crop.h * s;
  const kanan = kiri + lebar;
  const bawah = atas + tinggi;

  const posisiSudut: Record<Sudut, { left: number; top: number }> = {
    nw: { left: kiri, top: atas },
    ne: { left: kanan, top: atas },
    sw: { left: kiri, top: bawah },
    se: { left: kanan, top: bawah },
  };

  // Root lebih besar setengah area sentuh (TEPI) di tiap sisi dibanding foto. Titik tarik (48 dp)
  // berpusat di sudut foto, jadi separuhnya berada di luar foto; sentuhan di luar batas induk
  // tidak diterima, sehingga root harus cukup besar untuk memuat seluruh area sentuh itu.
  return (
    <View
      style={[styles.root, { width: tampil.w + minTouchSize, height: tampil.h + minTouchSize }]}
    >
      <View style={[styles.foto, { left: TEPI, top: TEPI, width: tampil.w, height: tampil.h }]}>
        {/* Empat panel gelap di luar area crop. */}
        <View style={[styles.gelap, { left: 0, top: 0, width: tampil.w, height: atas }]} />
        <View
          style={[styles.gelap, { left: 0, top: bawah, width: tampil.w, height: tampil.h - bawah }]}
        />
        <View style={[styles.gelap, { left: 0, top: atas, width: kiri, height: tinggi }]} />
        <View
          style={[
            styles.gelap,
            { left: kanan, top: atas, width: tampil.w - kanan, height: tinggi },
          ]}
        />

        {/* Bingkai dan badan yang bisa digeser. */}
        <View
          {...handlers.badan}
          accessibilityLabel={LABEL.badan}
          testID="crop-badan"
          style={[styles.bingkai, { left: kiri, top: atas, width: lebar, height: tinggi }]}
        />
      </View>

      {SUDUT.map((sudut) => (
        <View
          key={sudut}
          {...handlers[sudut]}
          accessibilityLabel={LABEL[sudut]}
          testID={`crop-${sudut}`}
          style={[
            styles.area,
            {
              // Pusat titik tarik = sudut crop; TEPI mengimbangi geser root dan setengah area sentuh.
              left: posisiSudut[sudut].left,
              top: posisiSudut[sudut].top,
            },
          ]}
        >
          <View style={styles.titik} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', left: 0, top: 0 },
  foto: { position: 'absolute' },
  gelap: {
    position: 'absolute',
    backgroundColor: colors.scrim,
    opacity: 0.55,
    pointerEvents: 'none',
  },
  bingkai: { position: 'absolute', borderWidth: 2, borderColor: colors.onScrim },
  area: {
    position: 'absolute',
    width: minTouchSize,
    height: minTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titik: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.onScrim,
    pointerEvents: 'none',
  },
});
