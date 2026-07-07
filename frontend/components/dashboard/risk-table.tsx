'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p++
  ) {
    pages.push(p);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

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
  const pages = buildPageNumbers(safePage, totalPages);

  const handleRowClick = (productId: string) => {
    if (clickable) router.push(`/products/${productId}`);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);

  const formatDaysOfCover = (days: number) =>
    days >= 9999 ? '∞' : `${Math.round(days)} j`;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="rounded-lg border border-border/50 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="text-muted-foreground">Produit</TableHead>
              <TableHead className="text-muted-foreground">SKU</TableHead>
              {!compact && (
                <TableHead className="text-muted-foreground">
                  Catégorie
                </TableHead>
              )}
              <TableHead className="text-muted-foreground">Risque</TableHead>
              <TableHead className="text-muted-foreground text-right">
                Stock
              </TableHead>
              <TableHead className="text-muted-foreground">
                Couverture
              </TableHead>
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
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {products.length === 0
            ? '0 résultat'
            : `${start + 1}–${Math.min(start + PAGE_SIZE, products.length)} sur ${products.length}`}
        </span>
        <Pagination className="w-auto mx-0 justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (safePage > 1) setPage(safePage - 1);
                }}
                className={cn(
                  safePage === 1 && 'pointer-events-none opacity-40'
                )}
              />
            </PaginationItem>
            {pages.map((p, i) =>
              p === '...' ? (
                <PaginationItem key={`ellipsis-${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    isActive={p === safePage}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(p as number);
                    }}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (safePage < totalPages) setPage(safePage + 1);
                }}
                className={cn(
                  safePage === totalPages && 'pointer-events-none opacity-40'
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
