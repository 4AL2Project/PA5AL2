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
import { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

import { RiskBadge } from './risk-badge';

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
          {products.map((product) => (
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
  );
}
