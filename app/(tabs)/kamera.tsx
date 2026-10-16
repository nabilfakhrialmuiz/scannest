import type { FlashMode } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  DaftarHalaman,
  HALAMAN_MAKS,
  KameraScan,
  TinjauFoto,
  normalisasiFoto,
  useScanSession,
  type FotoMentah,
} from '@/features/scan';

type Tahap = 'kamera' | 'tinjau' | 'daftar';

export default function KameraScreen() {
  const { pages, isFull, addPage, removePage, movePage, clear } = useScanSession();

  const [tahap, setTahap] = useState<Tahap>(pages.length > 0 ? 'daftar' : 'kamera');
  const [foto, setFoto] = useState<FotoMentah | null>(null);
  const [memproses, setMemproses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [flash, setFlash] = useState<FlashMode>('off');
  const [grid, setGrid] = useState(true);

  // Layar tab tetap terpasang saat pengguna pindah tab, jadi fokus dilacak sendiri:
  // kamera hanya dipasang selagi layar ini terlihat (hanya satu pratinjau boleh aktif).
  const [fokus, setFokus] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFokus(true);
      return () => setFokus(false);
    }, []),
  );

  // Daftar kosong (halaman terakhir dihapus, sesi dibuang) otomatis kembali ke kamera.
  const tampil: Tahap =
    (tahap === 'daftar' && pages.length === 0) || (tahap === 'tinjau' && !foto) ? 'kamera' : tahap;

  const pakaiFoto = async () => {
    if (!foto || memproses) return;
    setMemproses(true);
    setGalat(null);
    try {
      const hasil = await normalisasiFoto(foto);
      if (!addPage(hasil)) {
        setGalat(`Sesi sudah berisi ${HALAMAN_MAKS} halaman, batas maksimum.`);
        return;
      }
      setFoto(null);
      setTahap('daftar');
    } catch {
      setGalat(
        'Foto belum bisa diproses. Coba tekan Pakai foto lagi, atau Ulang untuk memotret ulang.',
      );
    } finally {
      setMemproses(false);
    }
  };

  if (tampil === 'tinjau' && foto) {
    return (
      <TinjauFoto
        foto={foto}
        memproses={memproses}
        galat={galat}
        onPakai={() => void pakaiFoto()}
        onUlang={() => {
          setFoto(null);
          setGalat(null);
          setTahap('kamera');
        }}
      />
    );
  }

  if (tampil === 'daftar') {
    return (
      <DaftarHalaman
        pages={pages}
        isFull={isFull}
        onTambah={() => setTahap('kamera')}
        onHapus={removePage}
        onGeser={movePage}
        onMulaiUlang={() => {
          clear();
          setTahap('kamera');
        }}
      />
    );
  }

  return (
    <KameraScan
      aktif={fokus}
      flash={flash}
      onFlashChange={setFlash}
      grid={grid}
      onGridChange={setGrid}
      jumlahHalaman={pages.length}
      penuh={isFull}
      onFoto={(hasil) => {
        setFoto(hasil);
        setGalat(null);
        setTahap('tinjau');
      }}
      onLihatDaftar={() => setTahap('daftar')}
    />
  );
}

