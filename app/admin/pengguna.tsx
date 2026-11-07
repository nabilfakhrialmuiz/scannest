import { LoadingScreen, Screen } from '@/components';
import { DaftarPengguna } from '@/features/admin';
import { useAuth } from '@/features/auth';

export default function AdminPenggunaScreen() {
  const { session } = useAuth();
  const adminId = session?.user.id;
  if (!adminId) return <LoadingScreen />;
  return (
    <Screen padded={false} edges={['bottom']}>
      <DaftarPengguna adminId={adminId} />
    </Screen>
  );
}
