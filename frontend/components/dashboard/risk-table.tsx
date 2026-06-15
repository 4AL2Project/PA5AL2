'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

import { RiskBadge } from './risk-badge';

const PAGE_SIZE = 10;

interface RiskTableProps {
  products: Product[];
  showActions?: boolean;
  compact?: boolean;
  className?: string;
  clickable?: boolean;
}

export function RiskTable({
  products,
  showActions = true,
  compact = false,
  className,
  clickable = true,
}: RiskTableProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paginated = products.slice(start, start + PAGE_SIZE);

  const handleRowClick = (productId: string) => {
    if (clickable) {
      router.push(`/products/${productId}`);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatDaysOfCover = (days: number) => {
    return days >= 9999 ? '∞' : `${Math.round(days)} j`;
  };

  return (
    <div
      className={cn('rounded-lg border border-border/50 bg-card', className)}
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/50">
            <TableHead className="text-muted-foreground">Produit</TableHead>
            <TableHead className="text-muted-foreground">SKU</TableHead>
            {!compact && (
              <TableHead className="text-muted-foreground">Categorie</TableHead>
            )}
            <TableHead className="text-muted-foreground">Risque</TableHead>
            <TableHead className="text-muted-foreground text-right">
              Stock
            </TableHead>
            <TableHead className="text-muted-foreground">Couverture</TableHead>
            <TableHead className="text-muted-foreground text-right">
              Valeur
            </TableHead>
            {showActions && (
              <TableHead className="text-muted-foreground">Action</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.map((product) => (
            <TableRow
              key={product.id}
              className={cn(
                'border-border/50 hover:bg-muted/30',
                clickable && 'cursor-pointer'
              )}
              onClick={() => handleRowClick(product.id)}
            >
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {product.sku}
              </TableCell>
              {!compact && (
                <TableCell className="text-muted-foreground">
                  {product.category}
                </TableCell>
              )}
              <TableCell>
                <RiskBadge level={product.riskLevel} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {product.stock}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatDaysOfCover(product.daysOfCover)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(product.recoveryValue)}
              </TableCell>
              {showActions && (
                <TableCell className="text-muted-foreground text-sm">
                  {product.action}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {start + 1}–{Math.min(start + PAGE_SIZE, products.length)} sur{' '}
            {products.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={safePage === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs tabular-nums px-1">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
