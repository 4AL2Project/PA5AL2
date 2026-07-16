'use client';

import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Clock,
  Loader2,
  Mail,
  Pencil,
  Play,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AssoAdminForm } from '@/components/admin/asso-admin-form';
import {
  AssoStatutModal,
  StatutAction,
  statutForAction,
} from '@/components/admin/asso-statut-modal';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import {
  addAssoNote,
  AssoAllocationHistoryItem,
  AssociationAdminDetail,
  AssoLog,
  AssoNote,
  CreateAssoDto,
  fetchAdminAssociationDetail,
  fetchAssoAllocationHistory,
  fetchAssoLogs,
  inviterAsso,
  patchAssoStatut,
  PICKUP_DAYS,
  reliabilityColor,
  reliabilityStars,
  STATUS_BADGE,
  STATUS_LABELS,
  updateAdminAssociation,
} from '@/lib/admin-associations';

export function AssociationDetailClient({ id }: { id: string }) {
  const [asso, setAsso] = useState<AssociationAdminDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [statutAction, setStatutAction] = useState<StatutAction | null>(null);
  const [statutBusy, setStatutBusy] = useState(false);

  const [notes, setNotes] = useState<AssoNote[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);

  const [logs, setLogs] = useState<AssoLog[]>([]);
  const [logsPage, setLogsPage] = useState(1);
  const [logsHasMore, setLogsHasMore] = useState(false);

  const [history, setHistory] = useState<AssoAllocationHistoryItem[]>([]);
  const [historyStatut, setHistoryStatut] = useState('TOUS');

  const load = async () => {
    setLoading(true);
    try {
      const [detail, hist] = await Promise.all([
        fetchAdminAssociationDetail(id),
        fetchAssoAllocationHistory(id).catch(() => []),
      ]);
      setAsso(detail);
      setNotes(detail.notes);
      setLogs(detail.logs);
      setLogsHasMore(detail.logs.length >= 20);
      setHistory(hist);
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

  const handleEdit = async (dto: CreateAssoDto) => {
    setEditBusy(true);
    try {
      await updateAdminAssociation(id, dto);
      toast.success('Association mise à jour');
      setEditOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Mise à jour impossible');
    } finally {
      setEditBusy(false);
    }
  };

  const handleStatut = async (raison: string | undefined) => {
    if (!statutAction) return;
    setStatutBusy(true);
    try {
      await patchAssoStatut(id, {
        ...statutForAction(statutAction),
        raison,
      });
      toast.success('Statut mis à jour');
      setStatutAction(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Changement impossible');
    } finally {
      setStatutBusy(false);
    }
  };

  const handleInvite = async () => {
    try {
      await inviterAsso(id);
      toast.success('Invitation envoyée');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Envoi impossible');
    }
  };

  const handleAddNote = async () => {
    if (!noteDraft.trim()) return;
    setNoteBusy(true);
    try {
      const note = await addAssoNote(id, noteDraft.trim());
      setNotes((n) => [note, ...n]);
      setNoteDraft('');
      toast.success('Note enregistrée');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Enregistrement impossible');
    } finally {
      setNoteBusy(false);
    }
  };

  const loadMoreLogs = async () => {
    try {
      const next = await fetchAssoLogs(id, logsPage + 1);
      setLogs((l) => [...l, ...next.data]);
      setLogsPage(next.page);
      setLogsHasMore(next.page * next.limit < next.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chargement impossible');
    }
  };

  if (loading || !asso) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const score = asso.fiabilite.score;
  const hasEnough =
    asso.fiabilite.pickups_confirmes + asso.fiabilite.echecs_pickup >= 3;

  const filteredHistory =
    historyStatut === 'TOUS'
      ? history
      : history.filter((h) => h.status === historyStatut);
  const histCompletes = history.filter((h) => h.status === 'RETIREE').length;
  const histEchecs = history.filter((h) => h.status === 'NON_RECUPEREE').length;
  const lineValue = (h: AssoAllocationHistoryItem) =>
    h.lines.reduce((s, l) => s + l.quantity * l.unit_value, 0);
  const histValeur = history
    .filter((h) => h.status === 'RETIREE')
    .reduce((s, h) => s + lineValue(h), 0);

  return (
    <div className="min-h-svh bg-background">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/associations">
                <ArrowLeft className="mr-1 h-4 w-4" /> Retour liste
              </Link>
            </Button>
            <h1 className="text-base font-semibold">{asso.name}</h1>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[asso.status] ?? 'bg-muted'}`}
            >
              {STATUS_LABELS[asso.status] ?? asso.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" /> Éditer
            </Button>
            {asso.contact_email && (
              <Button size="sm" variant="outline" onClick={handleInvite}>
                <Mail className="mr-1 h-3.5 w-3.5" /> Invitation
              </Button>
            )}
            {asso.status === 'ACTIVE' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatutAction('SUSPENDRE')}
              >
                Suspendre
              </Button>
            )}
            {asso.status === 'SUSPENDUE' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStatutAction('REACTIVER')}
                >
                  <Play className="mr-1 h-3.5 w-3.5" /> Réactiver
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setStatutAction('BLACKLISTER')}
                >
                  <Ban className="mr-1 h-3.5 w-3.5" /> Blacklister
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        {/* Section 1 — Identité & configuration */}
        <Section title="Identité & configuration">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Field
              label="Adresse"
              value={`${asso.address}, ${asso.postal_code} ${asso.city}`}
            />
            <Field label="Email" value={asso.contact_email ?? '—'} />
            <Field label="Téléphone" value={asso.contact_phone ?? '—'} />
            <div>
              <p className="text-xs text-muted-foreground">Numéro agrément</p>
              <p className="flex items-center gap-2">
                {asso.agrement_numero ?? '—'}
                {asso.agrement_valide ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    Validé
                  </span>
                ) : (
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                    Manquant
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-1 text-xs text-muted-foreground">
              Catégories acceptées
            </p>
            <div className="flex flex-wrap gap-1.5">
              {asso.categories.map((c) => (
                <span
                  key={c}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-1 text-xs text-muted-foreground">
              Créneaux de récupération
            </p>
            <p className="text-sm">
              {asso.pickup_windows && asso.pickup_windows.length > 0
                ? asso.pickup_windows
                    .map(
                      (w) =>
                        `${PICKUP_DAYS.find((d) => d.value === w.day)?.label ?? w.day} ${w.start}-${w.end}`
                    )
                    .join(' · ')
                : 'Aucun créneau déclaré'}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Onboarding :</span>
            {asso.is_onboarded ? (
              <span className="text-xs text-emerald-700">Complété</span>
            ) : (
              <>
                <span className="text-xs text-amber-700">
                  {asso.magic_link_token_hash ? 'En attente' : 'Non invitée'}
                </span>
                {asso.contact_email && (
                  <Button size="sm" variant="outline" onClick={handleInvite}>
                    Renvoyer invitation
                  </Button>
                )}
              </>
            )}
          </div>
        </Section>

        {/* Section 2 — Performance & fiabilité */}
        <Section title="Performance & fiabilité">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {hasEnough ? `${score}%` : 'N/A'}{' '}
                  <span className="ml-1">{reliabilityStars(score)}</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${reliabilityColor(score)}`}
                  style={{ width: `${hasEnough ? score : 0}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
            <Stat label="Acceptés" value={asso.fiabilite.total_acceptes} />
            <Stat
              label="Pickups confirmés"
              value={asso.fiabilite.pickups_confirmes}
            />
            <Stat label="Échecs" value={asso.fiabilite.echecs_pickup} />
            <Stat label="Refus" value={asso.fiabilite.refus} />
            <Stat
              label="Délai réponse moyen"
              value={
                asso.fiabilite.avg_response_hours != null
                  ? `${Math.round(asso.fiabilite.avg_response_hours)} h`
                  : '—'
              }
            />
            <Stat
              label="Officines partenaires"
              value={asso.fiabilite.officines_partenaires}
            />
            <Stat
              label="Valeur totale reçue"
              value={`${asso.fiabilite.valeur_totale_ht.toFixed(2)} € HT`}
            />
            <Stat
              label="Économie fiscale"
              value={`${asso.fiabilite.tax_savings.toFixed(2)} €`}
            />
          </div>
        </Section>

        {/* Section 3 — Dons en cours */}
        <Section title={`Dons en cours (${asso.active_dons.length})`}>
          {asso.active_dons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun don en cours.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {asso.active_dons.map((d) => {
                const slotPassed = new Date(d.pickup_slot_end) < new Date();
                return (
                  <div
                    key={d.allocation_id}
                    className={`rounded-lg border p-3 text-sm ${slotPassed ? 'border-red-200 bg-red-50' : ''}`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium">
                        {d.donation.pharmacy.name ?? 'Officine'}
                      </span>
                      {slotPassed && (
                        <span className="flex items-center gap-1 text-[11px] text-red-700">
                          <AlertTriangle className="h-3 w-3" /> Créneau passé
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Retrait{' '}
                      {new Date(d.pickup_slot_start).toLocaleString('fr-FR')}
                    </p>
                    <ul className="mt-1 text-xs text-muted-foreground">
                      {d.lines.map((l, i) => (
                        <li key={i}>
                          {l.name} ×{l.quantity}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/dons/${d.donation.donation_id}`}>
                          Voir détail
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Section 4 — Historique tous les dons */}
        <Section title="Historique des dons">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {histCompletes} complété{histCompletes > 1 ? 's' : ''} ·{' '}
              {histEchecs} échec{histEchecs > 1 ? 's' : ''} ·{' '}
              {asso.fiabilite.refus} refus | Valeur totale :{' '}
              {histValeur.toFixed(2)} € HT
            </p>
            <select
              className="h-8 rounded-md border bg-background px-2 text-xs"
              value={historyStatut}
              onChange={(e) => setHistoryStatut(e.target.value)}
            >
              <option value="TOUS">Tous statuts</option>
              <option value="PLANIFIEE">Planifiée</option>
              <option value="RETIREE">Retirée</option>
              <option value="NON_RECUPEREE">Non récupérée</option>
            </select>
          </div>
          {filteredHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun don.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Officine</th>
                    <th className="px-3 py-2">Produits</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Cerfa</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((h) => (
                    <tr key={h.allocation_id} className="border-t">
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {new Date(h.pickup_slot_start).toLocaleDateString(
                          'fr-FR'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/admin/dons/${h.donation.donation_id}`}
                          className="text-primary hover:underline"
                        >
                          {h.donation.pharmacy?.name ?? '—'}
                        </Link>
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">
                        {h.lines
                          .map((l) => `${l.name} ×${l.quantity}`)
                          .join(', ')}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[h.status] ?? 'bg-muted'}`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {h.cerfa_url ? (
                          <a
                            href={
                              h.cerfa_url.startsWith('http')
                                ? h.cerfa_url
                                : `/api/be${h.cerfa_url}`
                            }
                            className="text-primary hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {h.cerfa_number ?? 'Télécharger'}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Section 5 — Logs système */}
        <Section title="Journal système">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun événement.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li key={l.log_id} className="flex items-start gap-2 text-sm">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString('fr-FR')} ·{' '}
                      {l.admin_email ?? 'système'}
                    </span>
                    <p>
                      <span className="font-medium">{l.action}</span>
                      {l.details ? ` — ${l.details}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {logsHasMore && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={loadMoreLogs}
            >
              Voir plus
            </Button>
          )}
        </Section>

        {/* Section 6 — Notes internes */}
        <Section title="Notes internes">
          <div className="space-y-3">
            <div className="space-y-2">
              <Textarea
                rows={3}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Ajouter une note interne…"
              />
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={noteBusy || !noteDraft.trim()}
              >
                {noteBusy ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Enregistrer note
              </Button>
            </div>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune note.</p>
            ) : (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li
                    key={n.note_id}
                    className="rounded-lg border bg-muted/30 p-3 text-sm"
                  >
                    <p className="text-xs text-muted-foreground">
                      {n.admin_email} ·{' '}
                      {new Date(n.created_at).toLocaleString('fr-FR')}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{n.contenu}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      </div>

      {/* Drawer édition */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Éditer « {asso.name} »</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <AssoAdminForm
              initial={asso}
              submitting={editBusy}
              onSubmit={handleEdit}
              onCancel={() => setEditOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Modal statut */}
      <AssoStatutModal
        action={statutAction}
        assoName={asso.name}
        submitting={statutBusy}
        onConfirm={handleStatut}
        onClose={() => setStatutAction(null)}
      />
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}
