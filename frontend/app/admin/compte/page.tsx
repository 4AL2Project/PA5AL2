import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { getSession } from '@/lib/session';

export default async function AdminComptePage() {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  return (
    <AdminShell
      title="Compte"
      description="Vos informations d’administrateur Savely."
      adminEmail={session.claims.email}
    >
      <div className="rounded-xl border bg-card p-12 text-center text-xs text-muted-foreground">
        Paramètres du compte à venir.
      </div>
    </AdminShell>
  );
}
