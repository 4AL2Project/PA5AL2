import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { fetchMe } from '@/lib/admin';
import { getSession } from '@/lib/session';

const STATUS_VARIANTS: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  PENDING: 'bg-amber-100 text-amber-800',
  INACTIVE: 'bg-gray-100 text-gray-600',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  PENDING: 'En attente',
  INACTIVE: 'Inactif',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function initials(
  firstName: string | null,
  lastName: string | null,
  email: string
): string {
  const from = [firstName, lastName].filter(Boolean).join(' ').trim();
  const source = from || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
}

export default async function AdminComptePage() {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  const me = await fetchMe(session.access_token);
  const fullName =
    [me.first_name, me.last_name].filter(Boolean).join(' ').trim() || '—';

  return (
    <AdminShell
      title="Compte"
      description="Vos informations d’administrateur Savely."
      adminEmail={session.claims.email}
    >
      <div className="max-w-2xl space-y-6">
        {/* En-tête profil */}
        <div className="flex items-center gap-4 rounded-xl border bg-card p-5">
          <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            {initials(me.first_name, me.last_name, me.email)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{me.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                Administrateur Savely
              </span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  STATUS_VARIANTS[me.status] ?? 'bg-gray-100 text-gray-600'
                }`}
              >
                {STATUS_LABELS[me.status] ?? me.status}
              </span>
            </div>
          </div>
        </div>

        {/* Informations personnelles */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">
            Informations personnelles
          </h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Prénom</dt>
              <dd className="mt-0.5 font-medium">{me.first_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Nom</dt>
              <dd className="mt-0.5 font-medium">{me.last_name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-0.5 font-medium break-all">{me.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Téléphone</dt>
              <dd className="mt-0.5 font-medium">{me.phone || '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Compte */}
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Compte</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Rôle</dt>
              <dd className="mt-0.5 font-medium">Administrateur Savely</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Statut</dt>
              <dd className="mt-0.5 font-medium">
                {STATUS_LABELS[me.status] ?? me.status}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Membre depuis</dt>
              <dd className="mt-0.5 font-medium">
                {formatDate(me.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                CGU acceptées le
              </dt>
              <dd className="mt-0.5 font-medium">
                {formatDate(me.accepted_terms_at)}
              </dd>
            </div>
          </dl>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Pour modifier vos informations, contactez un autre administrateur
          Savely.
        </p>
      </div>
    </AdminShell>
  );
}
