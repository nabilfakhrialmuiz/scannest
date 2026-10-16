import { z } from 'zod';

// Aturan isian. Batas nama (80) sama dengan constraint kolom profiles.nama di database (Fase 2).
const email = z
  .string()
  .trim()
  .min(1, 'Email wajib diisi')
  .pipe(z.email('Format email belum benar, contoh: nama@email.com'));

const passwordBaru = z
  .string()
  .min(8, 'Kata sandi minimal 8 karakter')
  .max(72, 'Kata sandi maksimal 72 karakter');

export const loginSchema = z.object({
  email,
  // Saat masuk cukup dicek tidak kosong; aturan panjang hanya berlaku untuk kata sandi baru.
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export const registerSchema = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(80, 'Nama maksimal 80 karakter'),
  email,
  password: passwordBaru,
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;

export type ValidationResult<T> =
  { ok: true; data: T } | { ok: false; errors: Partial<Record<keyof T, string>> };

// Menjalankan skema lalu mengubah galat zod menjadi satu pesan per kolom (pesan pertama saja).
export function validate<S extends z.ZodType<Record<string, unknown>>>(
  schema: S,
  values: unknown,
): ValidationResult<z.infer<S>> {
  const result = schema.safeParse(values);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  const errors: Partial<Record<keyof z.infer<S>, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof z.infer<S> | undefined;
    if (field !== undefined && errors[field] === undefined) {
      errors[field] = issue.message;
    }
  }
  return { ok: false, errors };
}

