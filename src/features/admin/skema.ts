import { z } from 'zod';

import type { StatusDokumen } from '@/features/dokumen/skema';

import type { AksiLog } from './daftar';

// Membaca jawaban RPC admin menjadi tipe aplikasi (zod). Baris yang bentuknya salah dilewati.

export type StatistikAdmin = {
  penggunaTotal: number;
  penggunaAktif: number;
  dokumenTotal: number;
  halamanTotal: number;
  ukuranByte: number;
};

const statistikSchema = z.object({
  pengguna_total: z.number(),
  pengguna_aktif: z.number(),
  dokumen_total: z.number(),
  halaman_total: z.number(),
  ukuran_byte: z.number(),
});

export function statistikDariJson(data: unknown): StatistikAdmin | null {
  const cek = statistikSchema.safeParse(data);
  if (!cek.success) return null;
  const d = cek.data;
  return {
    penggunaTotal: d.pengguna_total,
    penggunaAktif: d.pengguna_aktif,
    dokumenTotal: d.dokumen_total,
    halamanTotal: d.halaman_total,
    ukuranByte: d.ukuran_byte,
  };
}

export type PenggunaAdmin = {
  id: string;
  nama: string;
  email: string | null;
  role: 'user' | 'admin';
  isAktif: boolean;
  dibuatPada: string;
  jumlahDokumen: number;
};

const penggunaSchema = z.object({
  id: z.string(),
  nama: z.string(),
  email: z.string().nullable(),
  role: z.enum(['user', 'admin']),
  is_aktif: z.boolean(),
  dibuat_pada: z.string(),
  jumlah_dokumen: z.number(),
});

export function daftarPenggunaDariBaris(data: unknown): PenggunaAdmin[] {
  if (!Array.isArray(data)) return [];
  const hasil: PenggunaAdmin[] = [];
  for (const baris of data) {
    const cek = penggunaSchema.safeParse(baris);
    if (!cek.success) continue;
    const d = cek.data;
    hasil.push({
      id: d.id,
      nama: d.nama,
      email: d.email,
      role: d.role,
      isAktif: d.is_aktif,
      dibuatPada: d.dibuat_pada,
      jumlahDokumen: d.jumlah_dokumen,
    });
  }
  return hasil;
}

export type DokumenAdmin = {
  id: string;
  judul: string;
  status: StatusDokumen;
  jumlahHalaman: number;
  dibuatPada: string;
  userId: string;
  namaPemilik: string;
  emailPemilik: string | null;
  urlSampul: string | null;
};

const dokumenSchema = z.object({
  id: z.string(),
  judul: z.string(),
  status: z.enum(['draft', 'selesai']),
  jumlah_halaman: z.number().int(),
  dibuat_pada: z.string(),
  user_id: z.string(),
  nama_pemilik: z.string(),
  email_pemilik: z.string().nullable(),
  url_sampul: z.string().nullable(),
});

export function daftarDokumenAdminDariBaris(data: unknown): DokumenAdmin[] {
  if (!Array.isArray(data)) return [];
  const hasil: DokumenAdmin[] = [];
  for (const baris of data) {
    const cek = dokumenSchema.safeParse(baris);
    if (!cek.success) continue;
    const d = cek.data;
    hasil.push({
      id: d.id,
      judul: d.judul,
      status: d.status,
      jumlahHalaman: d.jumlah_halaman,
      dibuatPada: d.dibuat_pada,
      userId: d.user_id,
      namaPemilik: d.nama_pemilik,
      emailPemilik: d.email_pemilik,
      urlSampul: d.url_sampul,
    });
  }
  return hasil;
}

export type LogAdmin = {
  id: string;
  adminId: string | null;
  namaAdmin: string | null;
  emailAdmin: string | null;
  targetUserId: string | null;
  aksi: AksiLog;
  keterangan: string;
  waktu: string;
};

const logSchema = z.object({
  id: z.string(),
  admin_id: z.string().nullable(),
  nama_admin: z.string().nullable(),
  email_admin: z.string().nullable(),
  target_user_id: z.string().nullable(),
  aksi: z.enum(['nonaktifkan_akun', 'aktifkan_akun', 'hapus_akun', 'hapus_dokumen']),
  keterangan: z.string().nullable(),
  waktu: z.string(),
});

export function daftarLogDariBaris(data: unknown): LogAdmin[] {
  if (!Array.isArray(data)) return [];
  const hasil: LogAdmin[] = [];
  for (const baris of data) {
    const cek = logSchema.safeParse(baris);
    if (!cek.success) continue;
    const d = cek.data;
    hasil.push({
      id: d.id,
      adminId: d.admin_id,
      namaAdmin: d.nama_admin,
      emailAdmin: d.email_admin,
      targetUserId: d.target_user_id,
      aksi: d.aksi,
      keterangan: d.keterangan ?? '',
      waktu: d.waktu,
    });
  }
  return hasil;
}

export type AdminRingkas = { id: string; nama: string; email: string | null };

const adminSchema = z.object({ id: z.string(), nama: z.string(), email: z.string().nullable() });

export function daftarAdminDariBaris(data: unknown): AdminRingkas[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((baris) => {
    const cek = adminSchema.safeParse(baris);
    return cek.success ? [cek.data] : [];
  });
}

export type DetailDokumenAdminData = {
  id: string;
  judul: string;
  status: StatusDokumen;
  dibuatPada: string;
  userId: string;
  halaman: { id: string; urutan: number; urlHasil: string }[];
};

const detailSchema = z.object({
  id: z.string(),
  judul: z.string(),
  status: z.enum(['draft', 'selesai']),
  dibuat_pada: z.string(),
  user_id: z.string(),
  halaman_dokumen: z.array(
    z.object({ id: z.string(), urutan: z.number().int(), url_hasil: z.string() }),
  ),
});

export function detailDokumenAdminDariBaris(data: unknown): DetailDokumenAdminData | null {
  const cek = detailSchema.safeParse(data);
  if (!cek.success) return null;
  const d = cek.data;
  return {
    id: d.id,
    judul: d.judul,
    status: d.status,
    dibuatPada: d.dibuat_pada,
    userId: d.user_id,
    halaman: d.halaman_dokumen
      .map((h) => ({ id: h.id, urutan: h.urutan, urlHasil: h.url_hasil }))
      .sort((a, b) => a.urutan - b.urutan),
  };
}
