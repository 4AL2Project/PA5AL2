import { Building2, MailCheck, Plus, Send } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PharmacyListItem } from '@/lib/auth';
import { getSession } from '@/lib/session';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005';

async function fetchPharmacies(
  accessToken: string
): Promise<PharmacyListItem[]> {
  const res = await fetch(`${API_BASE}/api/admin/pharmacies`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const payload = (await res.json()) as
    | { success: true; data: { pharmacies?: PharmacyListItem[] } }
    | { success: false; error: unknown }
    | { pharmacies?: PharmacyListItem[] };
  const data =
    'success' in payload && payload.success
      ? payload.data
      : 'pharmacies' in payload
        ? payload
        : { pharmacies: [] };
  return data.pharmacies ?? [];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function titulaireName(item: PharmacyListItem): string {
  if (!item.titulaire) return '—';
  const { first_name, last_name } = item.titulaire;
  const full = [first_name, last_name].filter(Boolean).join(' ').trim();
  return full || item.titulaire.email;
}

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
      actions={
        <Button asChild>
          <Link href="/admin/pharmacies/new">
            <Plus className="h-3.5 w-3.5" />
            Inviter une officine
          </Link>
        </Button>
      }
    >
      {pharmacies.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-sm font-semibold">
            Aucune officine pour l’instant
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Créez la première officine pour démarrer. Un email d’activation sera
            envoyé à son titulaire.
          </p>
          <Button asChild className="mt-5">
            <Link href="/admin/pharmacies/new">
              <Plus className="h-3.5 w-3.5" />
              Inviter une officine
            </Link>
          </Button>
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
                <TableRow key={p.pharmacy_id}>
                  <TableCell className="text-xs font-medium">
                    <div className="flex flex-col">
                      <span>{p.name}</span>
                      {p.address && (
                        <span className="text-[10px] text-muted-foreground">
                          {p.address}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {p.siret ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs">{titulaireName(p)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.titulaire?.email ?? '—'}
                  </TableCell>
                  <TableCell>
                    {p.titulaire?.status === 'ACTIVE' ? (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <MailCheck className="h-3 w-3" />
                        Actif
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Send className="h-3 w-3" />
                        Invité
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground text-right">
                    {formatDate(p.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AdminShell>
  );
}
