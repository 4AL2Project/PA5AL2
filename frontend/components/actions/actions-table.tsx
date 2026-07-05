'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { DormantAction } from '@/lib/types';
import { cn } from '@/lib/utils';

export const PAGE_SIZE = 10;

const TYPE_COLORS: Record<DormantAction['type'], string> = {
  DON: 'bg-red-50 text-red-700 border-red-200',
  B2C: 'bg-amber-50 text-amber-700 border-amber-200',
};

interface ActionsTableProps {
  actions: DormantAction[];
  page: number;
  onPageChange: (page: number) => void;
  onOpenValidate: (action: DormantAction) => void;
  loading: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectPage: (ids: string[], checked: boolean) => void;
}

export function ActionsTable({
  actions,
  page,
  onPageChange,
  onOpenValidate,
  loading,
  selectedIds,
  onToggleSelect,
  onToggleSelectPage,
}: ActionsTableProps) {
  const totalPages = Math.ceil(actions.length / PAGE_SIZE);
  const slice = actions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = buildPageNumbers(page, totalPages);

  const pageIds = slice.map((a) => a.id);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));
  const headerState: boolean | 'indeterminate' = allPageSelected
    ? true
    : somePageSelected
      ? 'indeterminate'
      : false;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/50 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="w-10">
                <Checkbox
                  checked={headerState}
                  onCheckedChange={(checked) =>
                    onToggleSelectPage(pageIds, checked === true)
                  }
                  aria-label="Tout sélectionner sur cette page"
                />
              </TableHead>
              <TableHead className="text-muted-foreground">Produit</TableHead>
              <TableHead className="text-muted-foreground">SKU</TableHead>
              <TableHead className="text-muted-foreground">Catégorie</TableHead>
              <TableHead className="text-muted-foreground text-right">
                Couverture
              </TableHead>
              <TableHead className="text-muted-foreground text-right">
                Capital
              </TableHead>
              <TableHead className="text-muted-foreground">
                Suggestion
              </TableHead>
              <TableHead className="text-muted-foreground" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((action) => {
              const isSelected = selectedIds.has(action.id);
              return (
                <TableRow
                  key={action.id}
                  data-state={isSelected ? 'selected' : undefined}
                  className="border-border/50 hover:bg-muted/30 data-[state=selected]:bg-muted/40"
                >
                  <TableCell className="w-10">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleSelect(action.id)}
                      aria-label={`Sélectionner ${action.productName}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium max-w-[160px] truncate">
                    {action.productName}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {action.sku}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {action.category || '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {action.daysOfCover > 9999
                      ? '∞'
                      : `${Math.round(action.daysOfCover)} j`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-medium">
                    {action.capitalLocked != null
                      ? action.capitalLocked.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                          maximumFractionDigits: 0,
                        })
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        'border text-[10px] font-medium px-1.5 py-0',
                        TYPE_COLORS[action.type]
                      )}
                      variant="outline"
                    >
                      {action.type === 'DON' ? 'Don associatif' : 'Vente B2C'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={loading}
                      onClick={() => onOpenValidate(action)}
                    >
                      Gérer
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {actions.length === 0
            ? '0 résultat'
            : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, actions.length)} sur ${actions.length}`}
        </span>
        <Pagination className="w-auto mx-0 justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) onPageChange(page - 1);
                }}
                className={cn(page === 1 && 'pointer-events-none opacity-40')}
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
                    isActive={p === page}
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(p as number);
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
                  if (page < totalPages) onPageChange(page + 1);
                }}
                className={cn(
                  page === totalPages && 'pointer-events-none opacity-40'
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}

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
