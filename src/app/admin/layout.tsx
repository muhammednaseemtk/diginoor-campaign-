import { isServerAdminAuthenticated } from '@/lib/admin-auth';
import { AdminAuthGuard } from './AdminAuthGuard';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialAuthenticated = await isServerAdminAuthenticated();

  return (
    <AdminAuthGuard initialAuthenticated={initialAuthenticated}>
      {children}
    </AdminAuthGuard>
  );
}
