import { LoadingScreen, Screen } from '@/components';
import { DaftarLog } from '@/features/admin';
import { useAuth } from '@/features/auth';

export default function AdminLogScreen() {
  const { session } = useAuth();
  const adminId = session?.user.id;
  if (!adminId) return <LoadingScreen />;
  return (
    <Screen padded={false} edges={['bottom']}>
      <DaftarLog adminId={adminId} />
    </Screen>
  );
}
