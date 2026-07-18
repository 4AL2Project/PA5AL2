import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { LeadsAdminClient } from '@/components/admin/leads-admin-client';
import { getSession } from '@/lib/session';

export default async function LeadsPage() {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  return (
    <Suspense>
      <LeadsAdminClient adminEmail={session.claims.email} />
    </Suspense>
  );
}
