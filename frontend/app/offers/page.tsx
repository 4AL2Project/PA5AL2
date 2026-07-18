'use client';

import {
  Ban,
  Eye,
  EyeOff,
  Loader2,
  PackageSearch,
  RefreshCw,
  Settings2,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';
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
import {
  fetchOffers,
  resumeOffer,
  suspendOffer,
  terminateOffer,
} from '@/lib/api';
import { Offer, OfferStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const map: Record<OfferStatus, { label: string; className: string }> = {
    ACTIVE: {
      label: 'Active',
      className: 'bg-emerald-100 text-emerald-700',
    },
    SUSPENDUE: {
      label: 'Suspendue',
      className: 'bg-yellow-100 text-yellow-700',
    },
    TERMINEE: {
      label: 'Terminée',
      className: 'bg-muted text-muted-foreground',
    },
  };
  const { label, className } = map[status];
  return <Badge className={`text-xs ${className}`}>{label}</Badge>;
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [confirmOffer, setConfirmOffer] = useState<Offer | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      setOffers(await fetchOffers());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const withAction = async (
    offerId: string,
    fn: () => Promise<Offer>,
    successMsg: string
  ) => {
    setActionId(offerId);
    try {
      const updated = await fn();
      setOffers((prev) =>
        prev.map((o) => (o.offer_id === updated.offer_id ? updated : o))
      );
      toast.success(successMsg);
    } catch {
      toast.error('Une erreur est survenue');
    } finally {
      setActionId(null);
    }
  };

  const handleTerminate = (offer: Offer) => {
    setConfirmOffer(offer);
  };

  const totalPages = Math.max(1, Math.ceil(offers.length / PAGE_SIZE));
  const paginated = useMemo(
    () => offers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [offers, page]
  );
  const pages = buildPageNumbers(page, totalPages);

  const activeCount = offers.filter((o) => o.status === 'ACTIVE').length;
  const suspendedCount = offers.filter((o) => o.status === 'SUSPENDUE').length;

  return (
    <>
      <DashboardLayout
        title="Offres B2C"
        description={
          loading
            ? 'Chargement…'
            : `${offers.length} offre${offers.length !== 1 ? 's' : ''}`
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-medium">Liste des offres</h2>
              {activeCount > 0 && (
                <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0">
                  {activeCount} active{activeCount !== 1 ? 's' : ''}
                </Badge>
              )}
              {suspendedCount > 0 && (
                <Badge className="text-xs bg-yellow-100 text-yellow-700 border-0">
                  {suspendedCount} suspendue{suspendedCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={load}
              className="gap-1.5 text-muted-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser
            </Button>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-border/50 bg-card">
              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : offers.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <PackageSearch className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Aucune offre publiée. Validez des actions B2C pour créer des
                    offres.
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
                        SKU
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Prix remisé
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Qté offerte
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Réservations
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Statut
                      </TableHead>
                      <TableHead className="text-muted-foreground">
                        Créée le
                      </TableHead>
                      <TableHead className="text-muted-foreground" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((offer) => {
                      const isBusy = actionId === offer.offer_id;
                      return (
                        <TableRow
                          key={offer.offer_id}
                          className="border-border/50 hover:bg-muted/30"
                        >
                          <TableCell className="font-medium max-w-[160px] truncate">
                            <Link
                              href={`/offers/${offer.offer_id}`}
                              className="hover:text-primary hover:underline"
                            >
                              {offer.product.name}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {offer.product.external_sku}
                          </TableCell>
                          <TableCell>
                            {formatPrice(offer.discounted_price)}
                          </TableCell>
                          <TableCell>{offer.quantity_offered}</TableCell>
                          <TableCell>
                            {offer._count?.orders ?? 0} active
                            {(offer._count?.orders ?? 0) !== 1 ? 's' : ''}
                          </TableCell>
                          <TableCell>
                            <OfferStatusBadge status={offer.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(offer.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <IconButton
                                variant="ghost"
                                size="sm"
                                tooltip="Gérer l'offre"
                                onClick={() =>
                                  router.push(`/offers/${offer.offer_id}`)
                                }
                              >
                                <Settings2 className="h-4 w-4" />
                              </IconButton>
                              {offer.status === 'ACTIVE' && (
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  disabled={isBusy}
                                  tooltip="Suspendre l'offre"
                                  onClick={() =>
                                    withAction(
                                      offer.offer_id,
                                      () => suspendOffer(offer.offer_id),
                                      'Offre suspendue'
                                    )
                                  }
                                >
                                  {isBusy ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <EyeOff className="h-4 w-4" />
                                  )}
                                </IconButton>
                              )}
                              {offer.status === 'SUSPENDUE' && (
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  disabled={isBusy}
                                  tooltip="Réactiver l'offre"
                                  onClick={() =>
                                    withAction(
                                      offer.offer_id,
                                      () => resumeOffer(offer.offer_id),
                                      'Offre réactivée'
                                    )
                                  }
                                >
                                  {isBusy ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </IconButton>
                              )}
                              {offer.status !== 'TERMINEE' && (
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  disabled={isBusy}
                                  tooltip="Terminer l'offre (annule les réservations actives)"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleTerminate(offer)}
                                >
                                  {isBusy ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </IconButton>
                              )}
                              {offer.status === 'TERMINEE' && (
                                <Ban className="h-4 w-4 text-muted-foreground/40 mx-2" />
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
                {offers.length === 0
                  ? '0 résultat'
                  : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, offers.length)} sur ${offers.length}`}
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
                        page === totalPages && 'pointer-events-none opacity-40'
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>
      </DashboardLayout>

      <ConfirmDialog
        open={!!confirmOffer}
        onOpenChange={(open) => {
          if (!open) setConfirmOffer(null);
        }}
        title="Terminer cette offre ?"
        description={
          confirmOffer
            ? `L'offre "${confirmOffer.product.name}" sera fermée définitivement. Toutes les réservations actives (${confirmOffer._count?.orders ?? 0}) seront annulées et les clients notifiés.`
            : ''
        }
        confirmLabel="Terminer l'offre"
        onConfirm={() => {
          if (confirmOffer) {
            void withAction(
              confirmOffer.offer_id,
              () => terminateOffer(confirmOffer.offer_id),
              'Offre terminée'
            );
            setConfirmOffer(null);
          }
        }}
      />
    </>
  );
}
