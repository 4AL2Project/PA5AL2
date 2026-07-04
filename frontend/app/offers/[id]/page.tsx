'use client';

import {
  ArrowLeft,
  EyeOff,
  Home,
  ImagePlus,
  Loader2,
  PackageSearch,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  deleteOfferImage,
  fetchOfferDetail,
  resolveOfferImageUrl,
  resumeOffer,
  suspendOffer,
  terminateOffer,
  updateOffer,
  uploadOfferImages,
} from '@/lib/api';
import { OfferDetail, OfferStatus } from '@/lib/types';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES_PER_UPLOAD = 10;

const STATUS_META: Record<OfferStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: 'Active',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  SUSPENDUE: {
    label: 'Suspendue',
    className:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  TERMINEE: {
    label: 'Terminée',
    className: 'bg-muted text-muted-foreground',
  },
};

function formatPrice(price: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export default function OfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [offer, setOffer] = useState<OfferDetail | null | undefined>(undefined);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [errors, setErrors] = useState<{ price?: string; quantity?: string }>(
    {}
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [confirmTerminate, setConfirmTerminate] = useState(false);

  const hydrate = (o: OfferDetail) => {
    setOffer(o);
    setPrice(o.discounted_price.toFixed(2));
    setQuantity(String(o.quantity_offered));
    setExpiresAt(toDateInputValue(o.expires_at));
    setErrors({});
  };

  useEffect(() => {
    fetchOfferDetail(id)
      .then(hydrate)
      .catch(() => setOffer(null));
  }, [id]);

  const isTerminated = offer?.status === 'TERMINEE';

  const validate = (o: OfferDetail) => {
    const errs: typeof errors = {};
    const p = parseFloat(price);
    const q = parseInt(quantity, 10);
    if (Number.isNaN(p) || p <= 0) errs.price = 'Prix invalide (doit être > 0)';
    else if (p > o.product.unit_price)
      errs.price = `Le prix remisé doit être ≤ prix unitaire (${o.product.unit_price.toFixed(2)} €)`;
    if (Number.isNaN(q) || q <= 0)
      errs.quantity = 'Quantité invalide (doit être > 0)';
    else if (q > o.product.stock_quantity)
      errs.quantity = `Ne peut pas dépasser le stock (${o.product.stock_quantity})`;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!offer || !validate(offer)) return;
    setSaving(true);
    try {
      const updated = await updateOffer(offer.offer_id, {
        discounted_price: parseFloat(price),
        quantity_offered: parseInt(quantity, 10),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      hydrate(updated);
      toast.success('Offre mise à jour');
    } catch {
      toast.error("Impossible d'enregistrer les modifications");
    } finally {
      setSaving(false);
    }
  };

  const handleImagesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!offer || selected.length === 0) return;

    if (selected.length > MAX_IMAGES_PER_UPLOAD) {
      toast.error(`Maximum ${MAX_IMAGES_PER_UPLOAD} images à la fois`);
      return;
    }
    const invalidType = selected.find((f) => !f.type.startsWith('image/'));
    if (invalidType) {
      toast.error('Tous les fichiers doivent être des images');
      return;
    }
    const tooLarge = selected.find((f) => f.size > MAX_IMAGE_BYTES);
    if (tooLarge) {
      toast.error('Chaque image doit faire 5 Mo max');
      return;
    }

    setUploading(true);
    try {
      const updated = await uploadOfferImages(offer.offer_id, selected);
      setOffer(updated);
      toast.success(
        selected.length > 1
          ? `${selected.length} images ajoutées`
          : 'Image ajoutée'
      );
    } catch {
      toast.error("Échec de l'envoi des images");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!offer) return;
    setDeletingImageId(imageId);
    try {
      const updated = await deleteOfferImage(offer.offer_id, imageId);
      setOffer(updated);
      toast.success('Image supprimée');
    } catch {
      toast.error("Échec de la suppression de l'image");
    } finally {
      setDeletingImageId(null);
    }
  };

  const changeStatus = async (
    fn: () => Promise<{ offer_id: string }>,
    successMsg: string
  ) => {
    if (!offer) return;
    setStatusBusy(true);
    try {
      await fn();
      const refreshed = await fetchOfferDetail(offer.offer_id);
      setOffer(refreshed);
      toast.success(successMsg);
    } catch {
      toast.error('Changement de statut impossible');
    } finally {
      setStatusBusy(false);
    }
  };

  if (offer === undefined) {
    return (
      <DashboardLayout title="Chargement…">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (offer === null) {
    return (
      <DashboardLayout title="Offre introuvable">
        <div className="flex flex-col items-center justify-center py-20">
          <PackageSearch className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Offre introuvable</h2>
          <p className="text-muted-foreground mb-6">
            Cette offre n&apos;existe pas ou ne vous appartient pas.
          </p>
          <Button onClick={() => router.push('/offers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux offres
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const images = offer.images ?? [];
  const discount =
    offer.product.unit_price > 0 && parseFloat(price) > 0
      ? Math.round((1 - parseFloat(price) / offer.product.unit_price) * 100)
      : null;
  const statusMeta = STATUS_META[offer.status];

  return (
    <>
      <DashboardLayout
        title={offer.product.name}
        description={`SKU : ${offer.product.external_sku}`}
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="flex items-center gap-1">
                    <Home className="h-3.5 w-3.5" />
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/offers">Offres</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-emerald-600">
                  {offer.product.name}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
        actions={
          <Badge className={`text-xs ${statusMeta.className}`}>
            {statusMeta.label}
          </Badge>
        }
      >
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Images produit */}
            <Card>
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-base font-semibold">
                  Images produit{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({images.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-4">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-32 w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-emerald-300 bg-emerald-50/50 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-60 dark:border-emerald-800 dark:bg-emerald-950/20"
                  >
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <ImagePlus className="h-6 w-6" />
                    )}
                    <span className="text-xs font-medium">
                      Ajouter des images
                    </span>
                  </button>

                  {images.map((image) => {
                    const url = resolveOfferImageUrl(image.url);
                    const isDeleting = deletingImageId === image.image_id;
                    return (
                      <div
                        key={image.image_id}
                        className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border bg-muted/30"
                      >
                        {url && (
                          <img
                            src={url}
                            alt={offer.product.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDeleteImage(image.image_id)}
                          className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-destructive shadow-sm ring-1 ring-black/5 transition hover:bg-white disabled:opacity-70"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                          Retirer
                        </button>
                      </div>
                    );
                  })}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={handleImagesSelected}
                />
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WebP ou GIF · 5 Mo max · jusqu&apos;à{' '}
                  {MAX_IMAGES_PER_UPLOAD} à la fois
                </p>
              </CardContent>
            </Card>

            {/* Informations de l'offre */}
            <Card>
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-base font-semibold">
                  Informations de l&apos;offre
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Prix unitaire
                    </p>
                    <p className="font-medium mt-0.5">
                      {formatPrice(offer.product.unit_price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Stock disponible
                    </p>
                    <p className="font-medium mt-0.5">
                      {offer.product.stock_quantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Réservations
                    </p>
                    <p className="font-medium mt-0.5">
                      {offer.reserved_quantity} active
                      {offer.reserved_quantity !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Catégorie</p>
                    <p className="font-medium mt-0.5">
                      {offer.product.category || '—'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-1.5">
                  <Label htmlFor="offer-price">
                    Prix remisé (€){' '}
                    {discount !== null && discount > 0 && (
                      <span className="ml-1 text-xs text-emerald-600 font-normal">
                        -{discount}%
                      </span>
                    )}
                  </Label>
                  <Input
                    id="offer-price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    disabled={isTerminated}
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      setErrors((prev) => ({ ...prev, price: undefined }));
                    }}
                  />
                  {errors.price && (
                    <p className="text-xs text-destructive">{errors.price}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="offer-qty">
                    Quantité proposée{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      (max {offer.product.stock_quantity})
                    </span>
                  </Label>
                  <Input
                    id="offer-qty"
                    type="number"
                    step="1"
                    min="1"
                    disabled={isTerminated}
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value);
                      setErrors((prev) => ({ ...prev, quantity: undefined }));
                    }}
                  />
                  {errors.quantity && (
                    <p className="text-xs text-destructive">
                      {errors.quantity}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="offer-expires">
                    Date d&apos;expiration{' '}
                    <span className="text-xs text-muted-foreground font-normal">
                      (optionnel)
                    </span>
                  </Label>
                  <Input
                    id="offer-expires"
                    type="date"
                    disabled={isTerminated}
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full gap-2"
                  disabled={saving || isTerminated}
                  onClick={handleSave}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Enregistrer les modifications
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Statut de l'offre */}
          <Card>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold">
                Statut de l&apos;offre
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isTerminated ? (
                <p className="text-sm text-muted-foreground">
                  Cette offre est terminée. Aucune action n&apos;est possible.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {offer.status === 'ACTIVE' && (
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={statusBusy}
                      onClick={() =>
                        changeStatus(
                          () => suspendOffer(offer.offer_id),
                          'Offre suspendue'
                        )
                      }
                    >
                      <EyeOff className="h-4 w-4" />
                      Suspendre
                    </Button>
                  )}
                  {offer.status === 'SUSPENDUE' && (
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={statusBusy}
                      onClick={() =>
                        changeStatus(
                          () => resumeOffer(offer.offer_id),
                          'Offre réactivée'
                        )
                      }
                    >
                      <RotateCcw className="h-4 w-4" />
                      Réactiver
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="gap-2 text-destructive hover:text-destructive"
                    disabled={statusBusy}
                    onClick={() => setConfirmTerminate(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Terminer l&apos;offre
                  </Button>
                  {statusBusy && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>

      <ConfirmDialog
        open={confirmTerminate}
        onOpenChange={setConfirmTerminate}
        title="Terminer cette offre ?"
        description={`L'offre "${offer.product.name}" sera fermée définitivement. Toutes les réservations actives (${offer.reserved_quantity}) seront annulées et les clients notifiés.`}
        confirmLabel="Terminer l'offre"
        onConfirm={() => {
          setConfirmTerminate(false);
          void changeStatus(
            () => terminateOffer(offer.offer_id),
            'Offre terminée'
          );
        }}
      />
    </>
  );
}
