'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { createAdminUser } from '@/lib/api';

export function AddAdminUserDrawer() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !firstName || !lastName) return;
    setLoading(true);
    try {
      await createAdminUser({ email, first_name: firstName, last_name: lastName });
      toast.success('Invitation envoyée');
      setOpen(false);
      setEmail('');
      setFirstName('');
      setLastName('');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('409') || message.includes('409')) {
        toast.error('Un compte existe déjà pour cet email');
      } else {
        toast.error("Impossible d'envoyer l'invitation");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" />
          Inviter un admin
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base">Inviter un administrateur</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 px-5 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="admin-email" className="text-xs">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="admin-email"
              type="email"
              className="h-8 text-xs"
              placeholder="alice@savely.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="admin-first-name" className="text-xs">
              Prénom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="admin-first-name"
              className="h-8 text-xs"
              placeholder="Alice"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="admin-last-name" className="text-xs">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input
              id="admin-last-name"
              className="h-8 text-xs"
              placeholder="Martin"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Un email d&apos;invitation sera envoyé. L&apos;admin devra choisir un mot
            de passe via le lien reçu (valable 48h).
          </p>
          <div className="mt-auto flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={loading || !email || !firstName || !lastName}>
              Envoyer l&apos;invitation
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
