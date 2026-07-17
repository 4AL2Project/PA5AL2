import { redirect } from ‘next/navigation’;

import { DashboardLayout } from ‘@/components/dashboard-layout’;
import { OfficineSettingsForm } from ‘@/components/settings/officine-settings-form’;
import { fetchMyPharmacy } from ‘@/lib/pharmacy’;
import { getSession } from ‘@/lib/session’;

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) {
    redirect(‘/login’);
  }
  // La gestion de l’officine est réservée au titulaire.
  if (session.claims.role !== ‘TITULAIRE’) {
    redirect(‘/’);
  }

  const pharmacy = await fetchMyPharmacy(session.access_token);

  return (
    <DashboardLayout
      title="Paramètres"
      description="Gérez les informations de votre officine."
      userEmail={session.claims.email}
    >
      {pharmacy ? (
        <div className="space-y-6">
          <OfficineSettingsForm pharmacy={pharmacy} />
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-12 text-center text-xs text-muted-foreground">
          Impossible de charger les informations de l’officine.
        </div>
      )}
    </DashboardLayout>
  );
}
