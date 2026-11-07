import { LoadingScreen, Screen } from '@/components';
import { StatistikAdmin } from '@/features/admin';
import { useAuth } from '@/features/auth';

export default function AdminDashboardScreen() {
  const { session } = useAuth();
  const adminId = session?.user.id;
  if (!adminId) return <LoadingScreen />;
  return (
    <Screen padded={false} edges={['bottom']}>
      <StatistikAdmin adminId={adminId} />
    </Screen>
  );
}
