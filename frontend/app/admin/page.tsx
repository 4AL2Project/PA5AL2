import { Building2 } from 'lucide-react';
import { redirect } from 'next/navigation';

import { AddPharmacyDrawer } from '@/components/admin/add-pharmacy-drawer';
import { AdminShell } from '@/components/admin/admin-shell';
import { PharmacyRow } from '@/components/admin/pharmacy-row';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchPharmacies } from '@/lib/admin';
import { getSession } from '@/lib/session';

export default async function AdminHomePage() {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  const pharmacies = await fetchPharmacies(session.access_token);

  return (
    <AdminShell
      title="Officines"
      description={
        pharmacies.length === 0
          ? 'Aucune officine inscrite pour le moment.'
          : `${pharmacies.length} officine${pharmacies.length > 1 ? 's' : ''} inscrite${pharmacies.length > 1 ? 's' : ''}.`
      }
      adminEmail={session.claims.email}
      actions={<AddPharmacyDrawer />}
    >
      {pharmacies.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-semibold">
            Aucune officine pour l'instant
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Créez la première officine pour démarrer. Un email d'activation sera
            envoyé à son titulaire.
          </p>
          <AddPharmacyDrawer className="mt-5" />
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Officine</TableHead>
                <TableHead className="text-xs">SIRET</TableHead>
                <TableHead className="text-xs">Titulaire</TableHead>
                <TableHead className="text-xs">Email</TableHead>
                <TableHead className="text-xs">Statut</TableHead>
                <TableHead className="text-xs text-right">
                  Inscrite le
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pharmacies.map((p) => (
                <PharmacyRow key={p.pharmacy_id} item={p} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminShell>
  );
}
