'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export function DeactivateOfficineButton({
  pharmacyId,
  status,
}: {
  pharmacyId: string;
  status: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const isActive = status !== 'INACTIVE';
  const nextStatus = isActive ? 'INACTIVE' : 'ACTIVE';

  const onConfirm = async () => {
    setPending(true);
    try {
      const res = await fetch(`/api/admin/pharmacies/${pharmacyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={
            isActive
              ? 'border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive'
              : ''
          }
        >
          {isActive ? 'Désactiver' : 'Réactiver'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isActive
              ? 'Désactiver cette officine ?'
              : 'Réactiver cette officine ?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isActive
              ? 'Les utilisateurs de l’officine ne pourront plus accéder à Savely jusqu’à réactivation.'
              : 'L’officine et ses utilisateurs retrouveront l’accès à Savely.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={pending}
            className={
              isActive
                ? 'bg-destructive text-white hover:bg-destructive/90'
                : ''
            }
          >
            {pending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            {isActive ? 'Désactiver' : 'Réactiver'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
