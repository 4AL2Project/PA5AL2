import { redirect } from 'next/navigation';

import { AssociationDetailClient } from '@/components/admin/association-detail-client';
import { getSession } from '@/lib/session';

export default async function AssociationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  const { id } = await params;
  return <AssociationDetailClient id={id} />;
}
