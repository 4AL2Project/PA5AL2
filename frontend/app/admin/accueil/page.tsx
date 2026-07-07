import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { getSession } from '@/lib/session';

export default async function AdminAccueilPage() {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  return (
    <AdminShell
      title="Accueil"
      description="Vue d’ensemble de la plateforme."
      adminEmail={session.claims.email}
    >
      <div className="rounded-xl border bg-card p-12 text-center text-xs text-muted-foreground">
        Tableau de bord à venir.
      </div>
    </AdminShell>
  );
}
