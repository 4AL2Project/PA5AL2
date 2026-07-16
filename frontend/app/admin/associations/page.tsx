import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { AssociationsAdminClient } from '@/components/admin/associations-admin-client';
import { getSession } from '@/lib/session';

// Wrapper serveur : garde d'accès admin + fourniture de l'email pour AdminShell.
// Toute la logique (filtres, fetch, modals) vit dans le composant client, qui
// dialogue avec le backend via le proxy same-origin `/api/be`.
export default async function AssociationsPage() {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  return (
    <Suspense>
      <AssociationsAdminClient adminEmail={session.claims.email} />
    </Suspense>
  );
}
