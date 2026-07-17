import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { LeadDetailClient } from '@/components/admin/lead-detail-client';
import { getSession } from '@/lib/session';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  const { id } = await params;

  return (
    <Suspense>
      <LeadDetailClient id={id} adminEmail={session.claims.email} />
    </Suspense>
  );
}
