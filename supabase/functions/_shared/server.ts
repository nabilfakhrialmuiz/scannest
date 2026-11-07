// Perekat Deno untuk fungsi admin (Fase 8): CORS, pembacaan kunci, klien Supabase, dan
// implementasi `DepsPemanggil`. Berkas ini memakai API Deno dan paket npm, jadi TIDAK diuji
// dengan `npm test`; logika yang bisa diuji ada di `logic.ts` masing-masing fungsi.
//
// Dua klien dengan peran berbeda:
//   * klienPemanggil : memakai kunci publishable + JWT pemanggil. Dipakai untuk menanyakan
//                      siapa pemanggil dan apakah ia admin (is_admin()). RLS tetap berlaku.
//   * klienAdmin     : memakai SECRET KEY. Melewati RLS dan hanya dibuat SETELAH pemanggil
//                      terbukti admin. Kunci ini hanya ada di lingkungan fungsi.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import type { DepsPemanggil, EntriLog, Jawaban } from './admin.ts';
import { hapusAsetCloudinary, type KonfigCloudinary } from './cloudinary.ts';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function balas(jawaban: Pick<Jawaban, 'status' | 'body'>): Response {
  return new Response(JSON.stringify(jawaban.body), {
    status: jawaban.status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Kunci baru berbentuk JSON {"default": "..."}; `cadangan` adalah nama variabel kunci lama. */
function bacaKunci(nama: string, cadangan: string): string {
  try {
    const kunci = JSON.parse(Deno.env.get(nama) ?? '{}');
    if (typeof kunci.default === 'string') return kunci.default;
  } catch {
    // lanjut ke cadangan
  }
  return Deno.env.get(cadangan) ?? '';
}

export function bacaCloudinary(): KonfigCloudinary | null {
  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

export const hapusAsetDari = (konfig: KonfigCloudinary) => (publicId: string) =>
  hapusAsetCloudinary(publicId, konfig, (url, init) => fetch(url, init));

export const catatKeLog = (pesan: string, galat: unknown) =>
  console.error(pesan, galat instanceof Error ? galat.message : galat);

export type Pemanggil = {
  id: string | null;
  deps: Pick<DepsPemanggil, 'adalahAdmin' | 'catat'>;
};

/** Mengenali pemanggil dari JWT-nya. `id` null bila tidak ada JWT yang sah. */
export async function kenaliPemanggil(req: Request): Promise<Pemanggil> {
  const authorization = req.headers.get('Authorization') ?? '';
  const klien = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    bacaKunci('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'),
    { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } },
  );
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data } = token ? await klien.auth.getUser(token) : { data: { user: null } };
  return {
    id: data.user?.id ?? null,
    deps: {
      async adalahAdmin() {
        const { data: ya, error } = await klien.rpc('is_admin');
        if (error) throw error;
        return ya === true;
      },
      catat: catatKeLog,
    },
  };
}

/** Klien dengan secret key. Panggil hanya setelah `periksaAdmin` meloloskan pemanggil. */
export function buatKlienAdmin(): SupabaseClient | null {
  const kunci = bacaKunci('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
  if (!kunci) return null;
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', kunci, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function tulisLogDb(klien: SupabaseClient) {
  return async (entri: EntriLog): Promise<void> => {
    const { error } = await klien.from('log_aktivitas').insert({
      admin_id: entri.adminId,
      target_user_id: entri.targetUserId,
      aksi: entri.aksi,
      keterangan: entri.keterangan,
    });
    if (error) throw error;
  };
}

/** Membaca semua public_id lewat RPC `admin_public_id`, halaman demi halaman. */
export async function bacaSemuaPublicId(
  klien: SupabaseClient,
  filter: { p_user_id?: string; p_dokumen_id?: string },
): Promise<string[]> {
  const UKURAN = 500;
  const hasil: string[] = [];
  for (let offset = 0; ; offset += UKURAN) {
    const { data, error } = await klien.rpc('admin_public_id', {
      ...filter,
      p_limit: UKURAN,
      p_offset: offset,
    });
    if (error) throw error;
    const baris = Array.isArray(data) ? (data as string[]) : [];
    hasil.push(...baris);
    if (baris.length < UKURAN) return hasil;
  }
}

const GALAT_BELUM_DIKONFIGURASI = {
  status: 500,
  body: { ok: false as const, kode: 'galat_server' as const, pesan: 'Server belum dikonfigurasi.' },
};

/**
 * Kerangka bersama semua fungsi admin: OPTIONS, hanya POST, badan JSON, lalu `tangani`.
 * `perluCloudinary` memeriksa secret Cloudinary di awal supaya salah konfigurasi ketahuan jelas.
 */
export function layani(
  tangani: (
    req: Request,
    badan: Record<string, unknown> | null,
    cloudinary: KonfigCloudinary | null,
  ) => Promise<Pick<Jawaban, 'status' | 'body'>>,
  opsi: { perluCloudinary: boolean },
) {
  Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') {
      return balas({
        status: 405,
        body: { ok: false, kode: 'permintaan_salah', pesan: 'Gunakan metode POST.' },
      });
    }
    const cloudinary = bacaCloudinary();
    if (opsi.perluCloudinary && !cloudinary) {
      console.error('Secret Cloudinary belum diatur di fungsi ini.');
      return balas(GALAT_BELUM_DIKONFIGURASI);
    }
    const mentah: unknown = await req.json().catch(() => null);
    const badan =
      mentah && typeof mentah === 'object' && !Array.isArray(mentah)
        ? (mentah as Record<string, unknown>)
        : null;
    return balas(await tangani(req, badan, cloudinary));
  });
}

export { GALAT_BELUM_DIKONFIGURASI };
