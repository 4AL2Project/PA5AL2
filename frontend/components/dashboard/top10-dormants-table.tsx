'use client';

import { useRouter } from 'next/navigation';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardData } from '@/lib/api';

import { RiskBadge } from './risk-badge';

interface Top10DormantsTableProps {
  dormants: DashboardData['top10Dormants'];
  financialMasked?: boolean;
}

const MASKED = '—';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDaysOfCover(days: number) {
  return days >= 9999 ? '∞' : `${Math.round(days)} j`;
}

export function Top10DormantsTable({
  dormants,
  financialMasked = false,
}: Top10DormantsTableProps) {
  const router = useRouter();

  if (dormants.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aucun produit dormant détecté — stock sain.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="text-muted-foreground">Produit</TableHead>
            <TableHead className="text-muted-foreground">SKU</TableHead>
            <TableHead className="text-muted-foreground">Catégorie</TableHead>
            <TableHead className="text-muted-foreground">Risque</TableHead>
            <TableHead className="text-muted-foreground text-right">
              Couverture
            </TableHead>
            <TableHead className="text-muted-foreground text-right">
              Capital immobilisé
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {dormants.map((item) => (
            <TableRow
              key={item.productId}
              className="border-border/50 cursor-pointer hover:bg-muted/30"
              onClick={() => router.push(`/products/${item.productId}`)}
            >
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {item.sku}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.category}
              </TableCell>
              <TableCell>
                <RiskBadge
                  level={item.riskLevel as 'critical' | 'high' | 'safe'}
                />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatDaysOfCover(item.daysOfCover)}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {financialMasked ? MASKED : formatCurrency(item.capitalLocked)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
