'use client';

import {
  CheckCheck,
  Loader2,
  Package,
  QrCode,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { IconButton } from '@/components/ui/icon-button';
import {
  cancelOrder,
  fetchOrderByQr,
  fetchOrders,
  markOrderReady,
  prepareOrder,
  withdrawOrder,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { Order, OrderStatus } from '@/lib/types';
import { toast } from 'sonner';

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Tous les statuts' },
  { value: 'RESERVEE', label: 'Réservée' },
  { value: 'EN_PREPARATION', label: 'En préparation' },
  { value: 'PRETE', label: 'Prête' },
  { value: 'RETIREE', label: 'Retirée' },
  { value: 'ANNULEE', label: 'Annulée' },
  { value: 'EXPIREE', label: 'Expirée' },
];

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> =
  {
    RESERVEE: {
      label: 'Réservée',
      className:
        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    EN_PREPARATION: {
      label: 'En préparation',
      className:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    PRETE: {
      label: 'Prête',
      className:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    RETIREE: { label: 'Retirée', className: 'bg-muted text-muted-foreground' },
    ANNULEE: {
      label: 'Annulée',
      className: 'bg-destructive/10 text-destructive',
    },
    EXPIREE: { label: 'Expirée', className: 'bg-muted text-muted-foreground' },
  };

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return <Badge className={`text-xs ${className}`}>{label}</Badge>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
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

const ACTIVE = new Set<OrderStatus>(['RESERVEE', 'EN_PREPARATION', 'PRETE']);

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('RESERVEE');
  const [actionId, setActionId] = useState<string | null>(null);
  const [qrInput, setQrInput] = useState('');
  const [qrOrder, setQrOrder] = useState<Order | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOrders(
        await fetchOrders(
          statusFilter === 'ALL' ? undefined : statusFilter || undefined
        )
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const withAction = async (
    orderId: string,
    fn: () => Promise<Order>,
    successMsg: string
  ) => {
    setActionId(orderId);
    try {
      const updated = await fn();
      setOrders((prev) =>
        prev.map((o) => (o.order_id === updated.order_id ? updated : o))
      );
      toast.success(successMsg);
    } catch {
      toast.error('Une erreur est survenue');
    } finally {
      setActionId(null);
    }
  };

  const handleQrSearch = async () => {
    if (!qrInput.trim()) return;
    setQrLoading(true);
    setQrError(null);
    setQrOrder(null);
    try {
      setQrOrder(await fetchOrderByQr(qrInput.trim()));
    } catch {
      setQrError('QR code introuvable ou non rattaché à votre pharmacie.');
      toast.error('QR code introuvable');
    } finally {
      setQrLoading(false);
    }
  };

  const handleStatusFilter = (v: string) => {
    setStatusFilter(v);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const paginated = useMemo(
    () => orders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [orders, page]
  );
  const pages = buildPageNumbers(page, totalPages);
  const activeCount = orders.filter((o) => ACTIVE.has(o.status)).length;

  return (
    <>
      <DashboardLayout
        title="Commandes"
        description={
          loading
            ? 'Chargement…'
            : `${orders.length} commande${orders.length !== 1 ? 's' : ''}`
        }
      >
        <div className="space-y-6">
          {/* QR Scanner */}
          <Card className="border-border/50">
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Scanner un QR code</span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Collez ou scannez le QR code ici…"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleQrSearch()}
                  className="max-w-sm font-mono text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => void handleQrSearch()}
                  disabled={qrLoading || !qrInput.trim()}
                >
                  {qrLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
                {qrInput && (
                  <IconButton
                    variant="ghost"
                    size="icon"
                    tooltip="Effacer"
                    onClick={() => {
                      setQrInput('');
                      setQrOrder(null);
                      setQrError(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </IconButton>
                )}
              </div>
              {qrError && (
                <p className="mt-2 text-sm text-destructive">{qrError}</p>
              )}
              {qrOrder && (
                <div className="mt-3 rounded-lg border border-border/50 bg-muted/30 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">
                      {qrOrder.offer.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {qrOrder.customer.first_name} {qrOrder.customer.last_name}{' '}
                      · {qrOrder.customer.email} · {qrOrder.quantity} unité
                      {qrOrder.quantity !== 1 ? 's' : ''}
                    </p>
                    <div className="mt-1">
                      <OrderStatusBadge status={qrOrder.status} />
                    </div>
                  </div>
                  {qrOrder.status === 'PRETE' && (
                    <Button
                      size="sm"
                      className="gap-2 shrink-0"
                      disabled={actionId === qrOrder.order_id}
                      onClick={() =>
                        withAction(
                          qrOrder.order_id,
                          () => withdrawOrder(qrOrder.order_id),
                          'Retrait validé'
                        ).then(() => setQrOrder(null))
                      }
                    >
                      {actionId === qrOrder.order_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCheck className="h-4 w-4" />
                      )}
                      Valider le retrait
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters + table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-medium">Liste des commandes</h2>
                {activeCount > 0 && (
                  <Badge className="rounded-full bg-primary/10 text-primary text-xs font-medium border-0">
                    {activeCount} en cours
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={handleStatusFilter}>
                  <SelectTrigger className="w-44 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <IconButton
                  variant="ghost"
                  size="sm"
                  tooltip="Actualiser"
                  onClick={load}
                  className="text-muted-foreground"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-lg border border-border/50 bg-card">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <Package className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      Aucune commande pour ce filtre.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-border/50">
                        <TableHead className="text-muted-foreground">
                          Produit
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Client
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Qté
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Statut
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Réservée le
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Expire le
                        </TableHead>
                        <TableHead className="text-muted-foreground" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((order) => {
                        const busy = actionId === order.order_id;
                        return (
                          <TableRow
                            key={order.order_id}
                            className="border-border/50 hover:bg-muted/30"
                          >
                            <TableCell className="font-medium max-w-[160px] truncate">
                              {order.offer.product.name}
                              <span className="block text-xs text-muted-foreground font-mono">
                                {order.offer.product.external_sku}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {order.customer.first_name}{' '}
                                {order.customer.last_name}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {order.customer.email}
                              </span>
                            </TableCell>
                            <TableCell>{order.quantity}</TableCell>
                            <TableCell>
                              <OrderStatusBadge status={order.status} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(order.reserved_at)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(order.expires_at)}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                {order.status === 'RESERVEE' && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={busy}
                                    onClick={() =>
                                      withAction(
                                        order.order_id,
                                        () => prepareOrder(order.order_id),
                                        'Commande en préparation'
                                      )
                                    }
                                  >
                                    {busy ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      'Préparer'
                                    )}
                                  </Button>
                                )}
                                {order.status === 'EN_PREPARATION' && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={busy}
                                    onClick={() =>
                                      withAction(
                                        order.order_id,
                                        () => markOrderReady(order.order_id),
                                        'Commande prête'
                                      )
                                    }
                                  >
                                    {busy ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      'Marquer prête'
                                    )}
                                  </Button>
                                )}
                                {order.status === 'PRETE' && (
                                  <Button
                                    size="sm"
                                    disabled={busy}
                                    onClick={() =>
                                      withAction(
                                        order.order_id,
                                        () => withdrawOrder(order.order_id),
                                        'Retrait validé'
                                      )
                                    }
                                  >
                                    {busy ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      'Valider retrait'
                                    )}
                                  </Button>
                                )}
                                {ACTIVE.has(order.status) && (
                                  <IconButton
                                    size="sm"
                                    variant="ghost"
                                    disabled={busy}
                                    tooltip="Annuler la commande"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setConfirmOrder(order)}
                                  >
                                    <X className="h-4 w-4" />
                                  </IconButton>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {orders.length === 0
                    ? '0 résultat'
                    : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, orders.length)} sur ${orders.length}`}
                </span>
                <Pagination className="w-auto mx-0 justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (page > 1) setPage(page - 1);
                        }}
                        className={cn(
                          page === 1 && 'pointer-events-none opacity-40'
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
                            isActive={p === page}
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
                          if (page < totalPages) setPage(page + 1);
                        }}
                        className={cn(
                          page === totalPages &&
                            'pointer-events-none opacity-40'
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>

      <ConfirmDialog
        open={!!confirmOrder}
        onOpenChange={(open) => {
          if (!open) setConfirmOrder(null);
        }}
        title="Annuler cette commande ?"
        description={
          confirmOrder
            ? `La réservation de ${confirmOrder.quantity} unité${confirmOrder.quantity !== 1 ? 's' : ''} de "${confirmOrder.offer.product.name}" par ${confirmOrder.customer.first_name} ${confirmOrder.customer.last_name} sera annulée. Le stock sera libéré et le client notifié.`
            : ''
        }
        confirmLabel="Annuler la commande"
        onConfirm={() => {
          if (confirmOrder) {
            void withAction(
              confirmOrder.order_id,
              () => cancelOrder(confirmOrder.order_id),
              'Commande annulée'
            );
            setConfirmOrder(null);
          }
        }}
      />
    </>
  );
}
