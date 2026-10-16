import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { KUALITAS_JPEG, LEBAR_MAKS, ukuranTarget, type Ukuran } from './ukuran';

export type FotoMentah = Ukuran & { uri: string };
export type FotoNormal = Ukuran & { uri: string };

/**
 * Normalisasi foto sebelum diunggah (roadmap 4.5):
 * 1. perkecil bila lebarnya melebihi LEBAR_MAKS (tidak pernah memperbesar),
 * 2. simpan ulang sebagai JPEG berkualitas KUALITAS_JPEG.
 *
 * Penyimpanan ulang membuat orientasi menyatu di piksel: berkas hasil tidak lagi bergantung
 * pada tag EXIF, jadi tampil tegak di mana pun (Cloudinary, peramban, aplikasi lain).
 * Yang dikembalikan hanya URI berkas dan ukurannya, tidak pernah base64 (aturan memori 4.7).
 */
export async function normalisasiFoto(foto: FotoMentah): Promise<FotoNormal> {
  const target = ukuranTarget(foto, LEBAR_MAKS);

  const context = ImageManipulator.manipulate(foto.uri);
  try {
    if (target.diperkecil) {
      context.resize({ width: target.width });
    }
    const gambar = await context.renderAsync();
    try {
      const hasil = await gambar.saveAsync({ format: SaveFormat.JPEG, compress: KUALITAS_JPEG });
      return { uri: hasil.uri, width: hasil.width, height: hasil.height };
    } finally {
      gambar.release();
    }
  } finally {
    context.release();
  }
}
