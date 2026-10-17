import { useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import { DbError, buatDokumen, judulSchema, simpanHalaman } from '@/features/dokumen';
import { UploadError, cloudinaryTerpasang, uploadImage } from '@/lib/cloudinary';

import { useScanSession, type HalamanScan } from './ScanSessionProvider';

function pesanDari(galat: unknown): string {
  if (galat instanceof UploadError || galat instanceof DbError) return galat.message;
  return 'Terjadi kesalahan yang tidak dikenal. Coba lagi.';
}

/**
 * Menyimpan sesi scan sebagai dokumen (tugas 5.6 dan 5.7):
 * 1. buat baris `dokumen` (draft) sekali saja,
 * 2. untuk tiap halaman, berurutan: unggah ke Cloudinary, lalu simpan baris `halaman_dokumen`,
 * 3. berhenti di halaman pertama yang gagal. Halaman sebelumnya sudah tersimpan dan aman;
 *    menekan tombol lagi hanya mengerjakan halaman yang belum selesai, tanpa membuat dokumen baru.
 */
export function useSimpanDokumen() {
  const { session } = useAuth();
  const { pages, dokumenId, judul, setDokumenId, patchPage } = useScanSession();
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const sedangJalan = useRef(false);
  const pembatal = useRef<AbortController | null>(null);

  // Meninggalkan layar atau keluar dari akun menghentikan unggahan yang sedang berjalan.
  useEffect(() => () => pembatal.current?.abort(), []);

  const selesai = pages.length > 0 && pages.every((p) => p.status === 'tersimpan');
  const sisa = pages.filter((p) => p.status !== 'tersimpan').length;

  const prosesHalaman = async (
    halaman: HalamanScan,
    id: string,
    urutan: number,
    sinyal: AbortSignal,
  ): Promise<boolean> => {
    let tahap: 'unggah' | 'simpan' = 'unggah';
    try {
      patchPage(halaman.id, { status: 'mengunggah', progress: 0, galat: null, urutan });

      // Hasil unggahan yang sudah ada dipakai ulang: percobaan ulang tidak mengunggah dua kali.
      let hasil = halaman.hasil;
      if (!hasil) {
        hasil = await uploadImage(halaman.uri, {
          signal: sinyal,
          onProgress: (progress) => patchPage(halaman.id, { progress }),
        });
        patchPage(halaman.id, { status: 'diunggah', progress: 1, hasil });
      }

      tahap = 'simpan';
      await simpanHalaman({ dokumenId: id, urutan, hasil });
      patchPage(halaman.id, { status: 'tersimpan', progress: 1, galat: null });
      return true;
    } catch (e) {
      if (e instanceof UploadError && e.kind === 'dibatalkan') return false;
      // Bila Cloudinary sudah berhasil, status kembali ke `diunggah` agar tampilan jujur.
      patchPage(halaman.id, {
        status: tahap === 'simpan' ? 'diunggah' : 'gagal',
        galat: pesanDari(e),
      });
      return false;
    }
  };

  const simpan = async () => {
    if (sedangJalan.current) return; // cegah ketukan ganda
    if (!cloudinaryTerpasang()) {
      setGalat(new UploadError('config').message);
      return;
    }
    const cekJudul = judulSchema.safeParse(judul);
    if (!cekJudul.success) {
      setGalat(cekJudul.error.issues[0]?.message ?? 'Judul belum benar');
      return;
    }
    if (!session) return;

    sedangJalan.current = true;
    setMenyimpan(true);
    setGalat(null);
    const kontrol = new AbortController();
    pembatal.current = kontrol;

    try {
      let id = dokumenId;
      if (!id) {
        id = await buatDokumen({ userId: session.user.id, judul: cekJudul.data });
        setDokumenId(id);
      }

      // Nomor urut dibagikan sekali dan tidak berubah; halaman baru mendapat nomor setelah yang terbesar.
      let urutanTerakhir = Math.max(0, ...pages.map((p) => p.urutan ?? 0));
      let gagal: HalamanScan | null = null;

      for (const halaman of pages) {
        if (kontrol.signal.aborted) return;
        if (halaman.status === 'tersimpan') continue;
        const urutan = halaman.urutan ?? ++urutanTerakhir;
        const berhasil = await prosesHalaman(halaman, id, urutan, kontrol.signal);
        if (!berhasil) {
          gagal = halaman;
          break;
        }
      }

      if (gagal && !kontrol.signal.aborted) {
        const nomor = pages.indexOf(gagal) + 1;
        setGalat(
          `Halaman ${nomor} belum berhasil disimpan. Halaman sebelumnya aman. Periksa pesannya, lalu tekan Coba lagi.`,
        );
      }
    } catch (e) {
      if (!(e instanceof UploadError && e.kind === 'dibatalkan')) setGalat(pesanDari(e));
    } finally {
      sedangJalan.current = false;
      setMenyimpan(false);
    }
  };

  return { simpan, menyimpan, galat, selesai, sisa, bersihkanGalat: () => setGalat(null) };
}

