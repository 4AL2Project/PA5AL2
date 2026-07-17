import { notFound, redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/admin-shell';
import { DevResetPanel } from '@/components/admin/dev-reset-panel';
import { fetchDevCounts } from '@/lib/admin';
import { devToolsEnabled } from '@/lib/dev-tools';
import { getSession } from '@/lib/session';

export default async function AdminDevPage() {
  if (!devToolsEnabled) {
    notFound();
  }

  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    redirect('/admin/login');
  }

  const counts = await fetchDevCounts(session.access_token);
  const rows = Object.entries(counts ?? {}).filter(([, n]) => n > 0);
  const total = rows.reduce((sum, [, n]) => sum + n, 0);

  return (
    <AdminShell
      title="Développeur"
      description="Outils de développement local. Indisponible en production."
      adminEmail={session.claims.email}
    >
      <div className="space-y-6">
        <DevResetPanel />

        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-semibold">Contenu de la base</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {counts === null
              ? 'Compteurs indisponibles : l’API est-elle démarrée ?'
              : rows.length === 0
                ? 'La base est vide.'
                : `${total} ligne${total > 1 ? 's' : ''} sur ${rows.length} table${rows.length > 1 ? 's' : ''}.`}
          </p>

          {rows.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
              {rows.map(([table, n]) => (
                <div
                  key={table}
                  className="flex items-baseline justify-between gap-2 border-b border-border/40 py-1"
                >
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    {table}
                  </span>
                  <span className="text-xs font-medium tabular-nums">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
