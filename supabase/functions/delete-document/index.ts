// Edge Function `delete-document` (tugas 7.5): menghapus dokumen milik pemanggil beserta semua
// file halamannya di Cloudinary. Dipanggil dari aplikasi lewat `supabase.functions.invoke`.
//
// Keamanan: `verify_jwt` bawaan (aktif) menolak permintaan tanpa JWT pengguna yang sah; kode di
// bawah masih memeriksa pemiliknya. Akses database memakai JWT pemanggil, jadi RLS tetap berlaku:
// fungsi ini TIDAK memakai secret key Supabase. API secret Cloudinary hanya ada sebagai secret
// fungsi (`supabase secrets set`), tidak pernah ada di aplikasi.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { hapusAsetCloudinary, prosesHapus, type Deps, type Jawaban } from './logic.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function balas(jawaban: Jawaban): Response {
  return new Response(JSON.stringify(jawaban.body), {
    status: jawaban.status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function kunciPublik(): string {
  // Kunci publishable baru berbentuk JSON {"default": "sb_publishable_..."}; anon adalah cadangan.
  try {
    const kunci = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}');
    if (typeof kunci.default === 'string') return kunci.default;
  } catch {
    // lanjut ke cadangan
  }
  return Deno.env.get('SUPABASE_ANON_KEY') ?? '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') {
    return balas({
      status: 405,
      body: { ok: false, kode: 'permintaan_salah', pesan: 'Gunakan metode POST.' },
    });
  }

  const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
  const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
  const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');
  const authorization = req.headers.get('Authorization') ?? '';
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Secret Cloudinary belum diatur di fungsi ini.');
    return balas({
      status: 500,
      body: { ok: false, kode: 'galat_server', pesan: 'Server belum dikonfigurasi.' },
    });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', kunciPublik(), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data } = token ? await supabase.auth.getUser(token) : { data: { user: null } };

  const badan = await req.json().catch(() => null);

  const deps: Deps = {
    async cariDokumen(id) {
      const { data: baris, error } = await supabase
        .from('dokumen')
        .select('user_id')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return baris ? { userId: baris.user_id as string } : null;
    },
    async daftarPublicId(dokumenId) {
      const { data: baris, error } = await supabase
        .from('halaman_dokumen')
        .select('public_id')
        .eq('dokumen_id', dokumenId);
      if (error) throw error;
      return (baris ?? []).map((b: { public_id: string }) => b.public_id);
    },
    hapusAset: (publicId) =>
      hapusAsetCloudinary(publicId, { cloudName, apiKey, apiSecret }, (url, init) =>
        fetch(url, init),
      ),
    catat: (pesan, galat) => console.error(pesan, galat instanceof Error ? galat.message : galat),
    async hapusBaris(dokumenId) {
      const { data: terhapus, error } = await supabase
        .from('dokumen')
        .delete()
        .eq('id', dokumenId)
        .select('id');
      if (error) throw error;
      return (terhapus?.length ?? 0) === 1;
    },
  };

  return balas(
    await prosesHapus({ userId: data.user?.id ?? null, dokumenId: badan?.dokumenId }, deps),
  );
});
