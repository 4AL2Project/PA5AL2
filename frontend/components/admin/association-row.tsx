'use client';

import { BarChart3, MapPin, Pencil, PowerOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TableCell, TableRow } from '@/components/ui/table';
import { Association } from '@/lib/admin';

import { AssociationForm } from './association-form';
import { AssociationStatsSheet } from './association-stats-sheet';

export function AssociationRow({ item }: { item: Association }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const handleDeactivate = async () => {
    if (
      !confirm(
        `Désactiver « ${item.name} » ? Elle n'apparaîtra plus dans le matching.`
      )
    )
      return;
    setDeactivating(true);
    try {
      await fetch(`/api/be/api/associations/${item.association_id}`, {
        method: 'DELETE',
      });
      router.refresh();
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <>
      <TableRow>
        <TableCell className="text-xs font-medium">
          <div className="flex items-center gap-2">
            {item.logo_url ? (
              <img
                src={`/api/be${item.logo_url}`}
                alt=""
                className="h-7 w-7 shrink-0 rounded-md object-contain"
              />
            ) : null}
            <span>{item.name}</span>
          </div>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {item.city} {item.postal_code}
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {item.categories.map((c) => (
              <Badge key={c} variant="secondary" className="text-[10px]">
                {c}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {item.contact_email ?? item.contact_phone ?? '—'}
        </TableCell>
        <TableCell>
          {item.lat != null && item.lng != null ? (
            <MapPin className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <MapPin className="h-3.5 w-3.5 text-muted-foreground/40" />
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setStatsOpen(true)}
              title="Fiche et fiabilité"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDeactivate}
              disabled={deactivating}
            >
              <PowerOff className="h-3.5 w-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle className="text-base">
              Modifier l&apos;association
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <AssociationForm
              initial={item}
              onCancel={() => setEditOpen(false)}
              onSaved={() => {
                setEditOpen(false);
                router.refresh();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AssociationStatsSheet
        association={item}
        open={statsOpen}
        onOpenChange={setStatsOpen}
      />
    </>
  );
}
