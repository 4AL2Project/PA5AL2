import { redirect } from 'next/navigation';

import { AddAdminUserDrawer } from '@/components/admin/add-admin-user-drawer';
import { AdminUsersTable } from '@/components/admin/admin-users-table';
import { AdminShell } from '@/components/admin/admin-shell';
import { fetchAdminUsers } from '@/lib/api';
import { getSession } from '@/lib/session';

export default async function AdminUtilisateursPage() {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  const { users, total } = await fetchAdminUsers();
  const totalActiveAdmins = users.filter((u) => u.status === 'ACTIVE').length;

  return (
    <AdminShell
      title="Équipe Savely"
      description="Comptes administrateurs du back-office Savely."
      adminEmail={session.claims.email}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">
          {total} administrateur{total !== 1 ? 's' : ''}
        </p>
        <AddAdminUserDrawer />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <AdminUsersTable
          users={users}
          currentUserId={session.claims.sub}
          totalActiveAdmins={totalActiveAdmins}
        />
      </div>
    </AdminShell>
  );
}
