import { Heart } from 'lucide-react';
import { redirect } from 'next/navigation';

import { AddAssociationDrawer } from '@/components/admin/add-association-drawer';
import { AdminShell } from '@/components/admin/admin-shell';
import { AssociationRow } from '@/components/admin/association-row';
import { AssociationValidationQueue } from '@/components/admin/association-validation-queue';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchAssociations, fetchPendingAssociations } from '@/lib/admin';
import { getSession } from '@/lib/session';

export default async function AssociationsPage() {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  const [associations, pending] = await Promise.all([
    fetchAssociations(session.access_token),
    fetchPendingAssociations(session.access_token),
  ]);

  return (
    <AdminShell
      title="Annuaire des associations"
      description={
        associations.length === 0
          ? 'Aucune association enregistrée.'
          : `${associations.length} association${associations.length > 1 ? 's' : ''} enregistrée${associations.length > 1 ? 's' : ''}.`
      }
      adminEmail={session.claims.email}
      actions={<AddAssociationDrawer />}
    >
      <AssociationValidationQueue pending={pending} />
      {associations.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Heart className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-semibold">
            Aucune association pour l&apos;instant
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Ajoutez la première association bénéficiaire pour alimenter le
            matching de dons.
          </p>
          <AddAssociationDrawer className="mt-5" />
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Nom</TableHead>
                <TableHead className="text-xs">Ville</TableHead>
                <TableHead className="text-xs">Catégories</TableHead>
                <TableHead className="text-xs">Contact</TableHead>
                <TableHead className="text-xs">GPS</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {associations.map((a) => (
                <AssociationRow key={a.association_id} item={a} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminShell>
  );
}
