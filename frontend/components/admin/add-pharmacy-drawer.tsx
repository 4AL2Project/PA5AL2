'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { CreatePharmacyForm } from '@/app/admin/pharmacies/new/create-pharmacy-form';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function AddPharmacyDrawer({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className={className}>
          <Plus className="h-3.5 w-3.5" />
          Ajouter une officine
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base">Ajouter une officine</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <CreatePharmacyForm
            onCancel={() => setOpen(false)}
            onCreated={() => {
              setOpen(false);
              toast.success('Officine créée avec succès');
              router.refresh();
            }}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
