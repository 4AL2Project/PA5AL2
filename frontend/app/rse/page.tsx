'use client';

/**
 * @author Dev1 — Savely
 * @version 1.0.0
 * @description Dashboard RSE : bilan fiscal et environnemental des dons
 *   associatifs par période, liste des Cerfa disponibles, export CSV comptable.
 *   Alerte au seuil déclaratif 8 000 € (art. 238 bis CGI).
 * @module DonAssociatif
 */

import { AlertTriangle, Download, FileText, Leaf, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DonationAllocationItem,
  donationCerfaUrl,
  DonationSummary,
  fetchDonations,
} from '@/lib/api';

// Seuil légal d'alerte déclarative art. 238 bis CGI
const SEUIL_ALERTE_EUR = 8_000;

type Period = '1m' | '3m' | '1y' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  '1m': 'Ce mois-ci',
  '3m': '3 derniers mois',
  '1y': 'Cette année',
  all: 'Depuis toujours',
};

function periodStart(period: Period): Date | null {
  const now = new Date();
  if (period === '1m') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (period === '3m') {
    return new Date(now.getFullYear(), now.getMonth() - 3, 1);
  }
  if (period === '1y') {
    return new Date(now.getFullYear(), 0, 1);
  }
  return null;
}

interface CerfaRow {
  allocation_id: string;
  association_name: string;
  picked_up_at: string | null;
  lines: DonationAllocationItem['lines'];
  value: number;
  cerfa_number: string | null;
}

export default function RsePage() {
  const [donations, setDonations] = useState<DonationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('1y');

  useEffect(() => {
    fetchDonations()
      .then(setDonations)
      .catch(() => toast.error('Impossible de charger les données RSE'))
      .finally(() => setLoading(false));
  }, []);

  const { kpis, cerfa } = useMemo(() => {
    const from = periodStart(period);

    const filtered = from
      ? donations.filter((d) => new Date(d.created_at) >= from)
      : donations;

    const retirees: CerfaRow[] = [];
    let totalValue = 0;
    const assosSet = new Set<string>();
    let totalProducts = 0;

    for (const don of filtered) {
      for (const alloc of don.allocations) {
        if (alloc.status !== 'RETIREE') continue;
        const value = alloc.lines.reduce(
          (s, l) => s + l.quantity * l.unit_value,
          0
        );
        totalValue += value;
        assosSet.add(alloc.association_id);
        totalProducts += alloc.lines.reduce((s, l) => s + l.quantity, 0);
        retirees.push({
          allocation_id: alloc.allocation_id,
          association_name: alloc.association.name,
          picked_up_at: alloc.picked_up_at,
          lines: alloc.lines,
          value,
          cerfa_number: alloc.cerfa_number,
        });
      }
    }

    return {
      kpis: {
        totalDons: filtered.filter((d) => d.status === 'COMPLETEE').length,
        totalValue,
        taxSavings: totalValue * 0.6,
        totalAssos: assosSet.size,
        totalProducts,
        alerte: totalValue >= SEUIL_ALERTE_EUR * 0.9,
        depasse: totalValue >= SEUIL_ALERTE_EUR,
      },
      cerfa: retirees.sort((a, b) =>
        (b.picked_up_at ?? '').localeCompare(a.picked_up_at ?? '')
      ),
    };
  }, [donations, period]);

  const exportCsv = () => {
    const header = [
      'Date retrait',
      'Association',
      'Produits',
      'Valeur HT (€)',
      'Éco. fiscale 60% (€)',
      'N° Cerfa',
    ].join(';');

    const rows = cerfa.map((r) => {
      const produits = r.lines
        .map((l) => `${l.name} ×${l.quantity}`)
        .join(' | ');
      return [
        r.picked_up_at
          ? new Date(r.picked_up_at).toLocaleDateString('fr-FR')
          : '',
        r.association_name,
        produits,
        r.value.toFixed(2),
        (r.value * 0.6).toFixed(2),
        r.cerfa_number ?? '',
      ].join(';');
    });

    const blob = new Blob(['﻿' + [header, ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `savely-rse-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  return (
    <DashboardLayout
      title="Bilan RSE"
      description="Impact social et avantage fiscal de vos dons associatifs (art. 238 bis CGI)."
    >
      <div className="space-y-6">
        {/* Sélecteur de période */}
        <div className="flex items-center justify-between gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(
                ([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>

          {cerfa.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
          )}
        </div>

        {/* Alerte seuil déclaratif */}
        {kpis.alerte && (
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 ${
              kpis.depasse
                ? 'border-destructive/40 bg-destructive/5'
                : 'border-amber-400/40 bg-amber-50'
            }`}
          >
            <AlertTriangle
              className={`mt-0.5 h-4 w-4 shrink-0 ${kpis.depasse ? 'text-destructive' : 'text-amber-600'}`}
            />
            <div>
              <p
                className={`text-sm font-medium ${kpis.depasse ? 'text-destructive' : 'text-amber-800'}`}
              >
                {kpis.depasse
                  ? 'Seuil déclaratif dépassé (8 000 €)'
                  : 'Seuil déclaratif bientôt atteint'}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Au-delà de 8 000 € de dons annuels, une déclaration spécifique
                est requise (art. 238 bis CGI). Consultez votre comptable.
              </p>
            </div>
          </div>
        )}

        {/* KPIs */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard
                label="Dons complétés"
                value={String(kpis.totalDons)}
                sub="lots entièrement récupérés"
              />
              <KpiCard
                label="Valeur donnée (coût HT)"
                value={fmt(kpis.totalValue)}
                sub="base de calcul Cerfa"
                highlight
              />
              <KpiCard
                label="Économie fiscale (60 %)"
                value={fmt(kpis.taxSavings)}
                sub="plafond : 20 000 € ou 0,5 % CA HT"
                green
              />
              <KpiCard
                label="Produits sauvés"
                value={String(kpis.totalProducts)}
                sub="unités données"
              />
              <KpiCard
                label="Associations partenaires"
                value={String(kpis.totalAssos)}
                sub="sur la période"
              />
            </div>

            {/* Liste des Cerfa */}
            <section className="rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">
                  Reçus fiscaux Cerfa 16216
                </h2>
                <Badge variant="secondary" className="ml-auto">
                  {cerfa.length}
                </Badge>
              </div>

              {cerfa.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-muted-foreground">
                  <Leaf className="h-8 w-8 opacity-30" />
                  <p>Aucun don complété sur cette période.</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {cerfa.map((row) => (
                    <li
                      key={row.allocation_id}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {row.association_name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {row.lines
                            .map((l) => `${l.name} ×${l.quantity}`)
                            .join(', ')}
                          {row.picked_up_at && (
                            <>
                              {' · '}
                              {new Date(row.picked_up_at).toLocaleDateString(
                                'fr-FR'
                              )}
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-medium">
                          {fmt(row.value)}
                        </span>
                        <a
                          href={donationCerfaUrl(row.allocation_id)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Cerfa
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function KpiCard({
  label,
  value,
  sub,
  highlight,
  green,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
  green?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${
          green
            ? 'text-emerald-700'
            : highlight
              ? 'text-foreground'
              : 'text-foreground'
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}
