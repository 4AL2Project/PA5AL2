'use client';

import { CheckCircle2, Clock, Loader2, Mail, Users } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

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
import {
  type DemoRequest,
  type DemoRequestList,
  fetchDemoRequests,
  fetchWaitlist,
  markDemoContacted,
  type WaitlistList,
} from '@/lib/admin-leads';

type Tab = 'demo' | 'waitlist';

const EMPTY_DEMO: DemoRequestList = { data: [], total: 0, page: 1, limit: 50 };
const EMPTY_WAITLIST: WaitlistList = {
  data: [],
  total: 0,
  page: 1,
  limit: 100,
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LeadsAdminClient({ adminEmail }: { adminEmail?: string }) {
  const [tab, setTab] = useState<Tab>('demo');
  const [demo, setDemo] = useState<DemoRequestList>(EMPTY_DEMO);
  const [waitlist, setWaitlist] = useState<WaitlistList>(EMPTY_WAITLIST);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const loadDemo = useCallback(async () => {
    try {
      setDemo(await fetchDemoRequests());
    } catch {
      toast.error('Impossible de charger les demandes de démo');
    }
  }, []);

  const loadWaitlist = useCallback(async () => {
    try {
      setWaitlist(await fetchWaitlist());
    } catch {
      toast.error('Impossible de charger la waitlist');
    }
  }, []);

  useEffect(() => {
    Promise.all([loadDemo(), loadWaitlist()]).finally(() => setLoading(false));
  }, [loadDemo, loadWaitlist]);

  const handleMarkContacted = async (row: DemoRequest) => {
    if (row.contacted_at) return;
    setMarkingId(row.id);
    try {
      const updated = await markDemoContacted(row.id);
      setDemo((prev) => ({
        ...prev,
        data: prev.data.map((d) => (d.id === updated.id ? updated : d)),
      }));
      toast.success(
        `${row.first_name} ${row.last_name} marqué(e) comme contacté(e)`
      );
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <AdminShell
      title="Leads & Waitlist"
      description="Demandes de démo et inscrits à la waitlist particuliers"
      adminEmail={adminEmail}
    >
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0 mb-6">
        <button
          onClick={() => setTab('demo')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'demo'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="h-4 w-4" />
          Demandes de démo
          <Badge
            variant={tab === 'demo' ? 'default' : 'secondary'}
            className="ml-1"
          >
            {demo.total}
          </Badge>
        </button>
        <button
          onClick={() => setTab('waitlist')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'waitlist'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          Waitlist particuliers
          <Badge
            variant={tab === 'waitlist' ? 'default' : 'secondary'}
            className="ml-1"
          >
            {waitlist.total}
          </Badge>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : tab === 'demo' ? (
        <DemoTable
          rows={demo.data}
          onMarkContacted={handleMarkContacted}
          markingId={markingId}
        />
      ) : (
        <WaitlistTable rows={waitlist.data} />
      )}
    </AdminShell>
  );
}

function DemoTable({
  rows,
  onMarkContacted,
  markingId,
}: {
  rows: DemoRequest[];
  onMarkContacted: (row: DemoRequest) => void;
  markingId: string | null;
}) {
  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
        <Mail className="h-10 w-10 opacity-30" />
        <p className="text-sm">Aucune demande de démo pour l'instant.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Contact</TableHead>
            <TableHead>Officine</TableHead>
            <TableHead className="text-center">Nb officines</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Reçu le</TableHead>
            <TableHead className="text-center">Statut</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={row.contacted_at ? 'opacity-60' : ''}
            >
              <TableCell>
                <div className="font-medium text-sm">
                  {row.first_name} {row.last_name}
                </div>
                <div className="text-xs text-muted-foreground">{row.email}</div>
                {row.phone && (
                  <div className="text-xs text-muted-foreground">
                    {row.phone}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-sm">{row.pharmacy_name}</TableCell>
              <TableCell className="text-center text-sm">
                {row.pharmacy_count}
              </TableCell>
              <TableCell className="max-w-[200px]">
                {row.message ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {row.message}
                  </p>
                ) : (
                  <span className="text-xs text-muted-foreground/50">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                {fmt(row.created_at)}
              </TableCell>
              <TableCell className="text-center">
                {row.contacted_at ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Contacté
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 text-amber-600 border-amber-200 bg-amber-50"
                  >
                    <Clock className="h-3 w-3" />À contacter
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" asChild className="text-xs h-7">
                    <Link href={`/admin/leads/${row.id}`}>Voir</Link>
                  </Button>
                  {!row.contacted_at && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={markingId === row.id}
                      onClick={() => onMarkContacted(row)}
                      className="text-xs h-7"
                    >
                      {markingId === row.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        'Marquer contacté'
                      )}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function WaitlistTable({
  rows,
}: {
  rows: { id: string; email: string; created_at: string }[];
}) {
  if (!rows.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
        <Users className="h-10 w-10 opacity-30" />
        <p className="text-sm">Aucun inscrit à la waitlist pour l'instant.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Inscrit le</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={row.id}>
              <TableCell className="text-muted-foreground text-sm">
                {i + 1}
              </TableCell>
              <TableCell className="font-medium text-sm">{row.email}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {fmt(row.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
