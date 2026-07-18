'use client';

import { ArrowLeft, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AdminShell } from '@/components/admin/admin-shell';
import { Button } from '@/components/ui/button';
import {
  type DemoRequest,
  fetchDemoRequest,
  markDemoContacted,
} from '@/lib/admin-leads';

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LeadDetailClient({
  id,
  adminEmail,
}: {
  id: string;
  adminEmail?: string;
}) {
  const [lead, setLead] = useState<DemoRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setLead(await fetchDemoRequest(id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleMarkContacted = async () => {
    if (!lead || lead.contacted_at) return;
    setMarking(true);
    try {
      const updated = await markDemoContacted(id);
      setLead(updated);
      toast.success(
        `${lead.first_name} ${lead.last_name} marqué(e) comme contacté(e)`
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Mise à jour impossible');
    } finally {
      setMarking(false);
    }
  };

  return (
    <AdminShell
      title="Détail du lead"
      description="Demande de démo"
      adminEmail={adminEmail}
    >
      {/* Breadcrumb */}
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/admin/leads">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Retour aux leads
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !lead ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          Lead introuvable.
        </div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="rounded-xl border bg-card p-6 space-y-5">
            {/* Statut */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {lead.first_name} {lead.last_name}
              </h2>
              {lead.contacted_at ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Contacté
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  <Clock className="h-3.5 w-3.5" />À contacter
                </span>
              )}
            </div>

            {/* Contact */}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contact
              </h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Prénom</dt>
                  <dd className="font-medium">{lead.first_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Nom</dt>
                  <dd className="font-medium">{lead.last_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd>
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-primary hover:underline"
                    >
                      {lead.email}
                    </a>
                  </dd>
                </div>
                {lead.phone && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Téléphone</dt>
                    <dd>{lead.phone}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Officine */}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Officine
              </h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Nom</dt>
                  <dd className="font-medium">{lead.pharmacy_name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Nombre d&apos;officines
                  </dt>
                  <dd>{lead.pharmacy_count}</dd>
                </div>
              </dl>
            </section>

            {/* Message */}
            {lead.message && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Message
                </h3>
                <blockquote className="rounded-lg border-l-4 border-primary/30 bg-muted/40 px-4 py-3 text-sm italic text-foreground">
                  {lead.message}
                </blockquote>
              </section>
            )}

            {/* Dates */}
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dates
              </h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Reçu le</dt>
                  <dd>{fmt(lead.created_at)}</dd>
                </div>
                {lead.contacted_at && (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Contacté le
                    </dt>
                    <dd>{fmt(lead.contacted_at)}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Action */}
            {!lead.contacted_at && (
              <div className="border-t pt-4">
                <Button onClick={handleMarkContacted} disabled={marking}>
                  {marking ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  )}
                  Marquer contacté
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
