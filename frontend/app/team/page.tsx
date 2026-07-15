import { redirect } from 'next/navigation';

import { DashboardLayout } from '@/components/dashboard-layout';
import { PreparateursManager } from '@/components/team/preparateurs-manager';
import { getSession } from '@/lib/session';
import { fetchMyPreparateurs } from '@/lib/team';

export default async function TeamPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  // Réservé au titulaire : les préparateurs ne gèrent pas l'équipe.
  if (session.claims.role !== 'TITULAIRE') {
    redirect('/');
  }

  const preparateurs = await fetchMyPreparateurs(session.access_token);

  return (
    <DashboardLayout
      title="Préparateurs"
      description="Gérez les préparateurs de commande de votre officine."
      userEmail={session.claims.email}
    >
      <PreparateursManager preparateurs={preparateurs} />
    </DashboardLayout>
  );
}
