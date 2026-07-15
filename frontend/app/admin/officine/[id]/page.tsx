import { ArrowLeft, Ban, Building2 } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { DeactivateOfficineButton } from '@/components/admin/deactivate-officine-button';
import { DeleteOfficineButton } from '@/components/admin/delete-officine-button';
import { OfficineDetail } from '@/components/admin/officine-detail';
import { Button } from '@/components/ui/button';
import { fetchAdminDonParametres, fetchAdminDonations, fetchPharmacy } from '@/lib/admin';
import { getSession } from '@/lib/session';

export default async function OfficineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  const { id } = await params;
  const [pharmacy, recentDons, donParams] = await Promise.all([
    fetchPharmacy(session.access_token, id),
    fetchAdminDonations(session.access_token, { pharmacy_id: id, page: 1, limit: 5 }),
    fetchAdminDonParametres(session.access_token, id),
  ]);

  if (!pharmacy) {
    return (
      <AdminShell
        title="Officine introuvable"
        description="Cette officine n’existe pas ou n’est plus accessible."
        adminEmail={session.claims.email}
        actions={
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/admin">
              <ArrowLeft className="h-3.5 w-3.5" />
              Retour
            </Link>
          </Button>
        }
      >
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-semibold">Officine introuvable</h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Vérifiez le lien ou revenez à la liste des officines.
          </p>
        </div>
      </AdminShell>
    );
  }

  const isInactive = pharmacy.status === 'INACTIVE';

  return (
    <AdminShell
      title={pharmacy.name}
      adminEmail={session.claims.email}
      actions={
        <div className="flex items-center gap-2">
          {isInactive && (
            <DeleteOfficineButton pharmacyId={pharmacy.pharmacy_id} />
          )}
          <DeactivateOfficineButton
            pharmacyId={pharmacy.pharmacy_id}
            status={pharmacy.status}
          />
        </div>
      }
    >
      {isInactive && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-xs text-destructive">
          <Ban className="h-3.5 w-3.5" />
          Cette officine est désactivée. Ses utilisateurs n’ont plus accès à
          Savely.
        </div>
      )}
      <OfficineDetail pharmacy={pharmacy} recentDons={recentDons} donParams={donParams} />
    </AdminShell>
  );
}
