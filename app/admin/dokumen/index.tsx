import { LoadingScreen, Screen } from '@/components';
import { DaftarDokumenAdmin } from '@/features/admin';
import { useAuth } from '@/features/auth';

export default function AdminDokumenScreen() {
  const { session } = useAuth();
  const adminId = session?.user.id;
  if (!adminId) return <LoadingScreen />;
  return (
    <Screen padded={false} edges={['bottom']}>
      <DaftarDokumenAdmin adminId={adminId} />
    </Screen>
  );
}
