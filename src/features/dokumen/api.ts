import type { HasilUnggah } from '@/lib/cloudinaryErrors';
import { supabase } from '@/lib/supabase';

// Akses tabel `dokumen` dan `halaman_dokumen` (skema Fase 2). Semua dijaga RLS: pengguna hanya
// bisa menulis miliknya sendiri, dan akun nonaktif ditolak.

export class DbError extends Error {
  readonly kind: 'jaringan' | 'izin' | 'lain';
  constructor(kind: 'jaringan' | 'izin' | 'lain') {
    super(
      kind === 'jaringan'
        ? 'Tidak bisa terhubung ke server. Periksa internetmu, lalu coba lagi.'
        : kind === 'izin'
          ? 'Akunmu tidak diizinkan menyimpan dokumen. Hubungi admin bila ini keliru.'
          : 'Data belum bisa disimpan. Coba lagi sebentar lagi.',
    );
    this.name = 'DbError';
    this.kind = kind;
  }
}

type GalatPostgrest = { code?: string; message?: string };

function jenisGalat(error: GalatPostgrest): DbError {
  if (error.code === '42501') return new DbError('izin');
  // Jaringan putus: PostgREST client mengembalikan galat tanpa kode, dengan pesan dari fetch.
  if (!error.code && /fetch|network|failed/i.test(error.message ?? '')) {
    return new DbError('jaringan');
  }
  return new DbError('lain');
}

/** Membuat dokumen baru berstatus draft dan mengembalikan id-nya. */
export async function buatDokumen(params: { userId: string; judul: string }): Promise<string> {
  const { data, error } = await supabase
    .from('dokumen')
    .insert({ user_id: params.userId, judul: params.judul, status: 'draft' })
    .select('id')
    .single();
  if (error) throw jenisGalat(error);
  const id = (data as { id?: unknown } | null)?.id;
  if (typeof id !== 'string') throw new DbError('lain');
  return id;
}

/**
 * Menyimpan satu halaman. url_hasil awalnya sama dengan url_asli; Fase 6 yang mengubahnya.
 * Bila sambungan putus tepat setelah server menyimpan, percobaan ulang akan menabrak kunci unik
 * (dokumen_id, urutan). Kalau baris itu ternyata halaman yang sama (public_id sama), anggap sudah tersimpan.
 */
export async function simpanHalaman(params: {
  dokumenId: string;
  urutan: number;
  hasil: HasilUnggah;
}): Promise<void> {
  const { dokumenId, urutan, hasil } = params;
  const { error } = await supabase.from('halaman_dokumen').insert({
    dokumen_id: dokumenId,
    urutan,
    url_asli: hasil.url,
    url_hasil: hasil.url,
    public_id: hasil.publicId,
    ukuran_byte: hasil.bytes,
  });
  if (!error) return;

  if (error.code === '23505') {
    const { data } = await supabase
      .from('halaman_dokumen')
      .select('id')
      .eq('dokumen_id', dokumenId)
      .eq('urutan', urutan)
      .eq('public_id', hasil.publicId)
      .maybeSingle();
    if (data) return;
  }
  throw jenisGalat(error);
}

