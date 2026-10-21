import { useLocalSearchParams } from 'expo-router';

import { LoadingScreen } from '@/components';
import { useAuth } from '@/features/auth';
import { DetailDokumen } from '@/features/dokumen';

export default function DokumenDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { session } = useAuth();
  const userId = session?.user.id;

  if (!userId || !id) return <LoadingScreen />;
  // key: berpindah ke dokumen lain mengosongkan keadaan lokal (indeks halaman, dialog).
  return <DetailDokumen key={id} userId={userId} dokumenId={id} />;
}