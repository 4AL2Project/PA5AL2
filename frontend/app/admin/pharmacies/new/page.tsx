import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { getSession } from '@/lib/session';

import { CreatePharmacyForm } from './create-pharmacy-form';

export default async function NewPharmacyPage() {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  return (
    <AdminShell
      title="Inviter une officine"
      description="Renseignez les informations de la pharmacie et de son titulaire. Un email d’activation lui sera envoyé."
      adminEmail={session.claims.email}
    >
      <div className="mx-auto max-w-2xl">
        <CreatePharmacyForm />
      </div>
    </AdminShell>
  );
}
