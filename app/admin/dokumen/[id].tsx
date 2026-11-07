import { useLocalSearchParams } from 'expo-router';

import { LoadingScreen } from '@/components';
import { DetailDokumenAdmin } from '@/features/admin';
import { useAuth } from '@/features/auth';

export default function AdminDokumenDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session } = useAuth();
  const adminId = session?.user.id;

  if (!adminId || !id) return <LoadingScreen />;
  // key: berpindah ke dokumen lain mengosongkan keadaan lokal (indeks halaman, dialog).
  return <DetailDokumenAdmin key={id} adminId={adminId} dokumenId={id} />;
}
