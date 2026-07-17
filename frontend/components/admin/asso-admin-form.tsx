'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AssociationAdminRow, CreateAssoDto } from '@/lib/admin-associations';
import { isValidEmail } from '@/lib/validation';

export interface AssoFormValues {
  name: string;
  email: string;
  telephone: string;
  address: string;
  city: string;
  postal_code: string;
  agrement_numero: string;
  agrement_valide: boolean;
  send_invitation: boolean;
}

export function emptyAssoForm(): AssoFormValues {
  return {
    name: '',
    email: '',
    telephone: '',
    address: '',
    city: '',
    postal_code: '',
    agrement_numero: '',
    agrement_valide: false,
    send_invitation: true,
  };
}

export function assoFormFrom(a: AssociationAdminRow): AssoFormValues {
  return {
    name: a.name,
    email: a.contact_email ?? '',
    telephone: a.contact_phone ?? '',
    address: a.address,
    city: a.city,
    postal_code: a.postal_code ?? '',
    agrement_numero: a.agrement_numero ?? '',
    agrement_valide: a.agrement_valide,
    send_invitation: false,
  };
}

export function formToDto(v: AssoFormValues): CreateAssoDto {
  return {
    name: v.name.trim(),
    email: v.email.trim(),
    telephone: v.telephone.trim() || undefined,
    address: v.address.trim(),
    city: v.city.trim(),
    postal_code: v.postal_code.trim() || undefined,
    agrement_numero: v.agrement_numero.trim() || undefined,
    agrement_valide: v.agrement_valide,
    send_invitation: v.send_invitation,
  };
}

interface Props {
  initial?: AssociationAdminRow;
  submitting: boolean;
  onSubmit: (dto: CreateAssoDto) => void;
  onCancel: () => void;
}

export function AssoAdminForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<AssoFormValues>(
    initial ? assoFormFrom(initial) : emptyAssoForm()
  );
  const isEdit = !!initial;

  const update = <K extends keyof AssoFormValues>(
    key: K,
    value: AssoFormValues[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const emailOk = isValidEmail(form.email.trim());
  const canSubmit =
    form.name.trim() !== '' &&
    emailOk &&
    form.address.trim() !== '' &&
    form.city.trim() !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(formToDto(form));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Nom *</Label>
          <Input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            disabled={submitting}
            placeholder="Croix Bleue Paris"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email *</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            disabled={submitting}
            placeholder="contact@asso.fr"
          />
          {form.email.trim() !== '' && !emailOk && (
            <p className="text-[11px] text-destructive">Email invalide.</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Téléphone</Label>
          <Input
            value={form.telephone}
            onChange={(e) => update('telephone', e.target.value)}
            disabled={submitting}
            placeholder="01 23 45 67 89"
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-xs">Adresse *</Label>
          <Input
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            disabled={submitting}
            placeholder="1 rue de la Paix"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Ville *</Label>
          <Input
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
            disabled={submitting}
            placeholder="Paris"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Code postal</Label>
          <Input
            value={form.postal_code}
            onChange={(e) => update('postal_code', e.target.value)}
            disabled={submitting}
            placeholder="75001"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Numéro d&apos;agrément</Label>
          <Input
            value={form.agrement_numero}
            onChange={(e) => update('agrement_numero', e.target.value)}
            disabled={submitting}
            placeholder="W751234567"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 pb-2 text-xs">
          <Checkbox
            checked={form.agrement_valide}
            onCheckedChange={(v) => update('agrement_valide', v === true)}
          />
          Agrément validé
        </label>
      </div>

      {form.agrement_numero.trim() === '' && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Génération de Cerfa impossible sans agrément.
        </div>
      )}

      {!isEdit && (
        <label className="flex cursor-pointer items-center gap-2 text-xs">
          <Checkbox
            checked={form.send_invitation}
            onCheckedChange={(v) => update('send_invitation', v === true)}
          />
          Envoyer l&apos;invitation après création
        </label>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={submitting || !canSubmit}>
          {submitting && (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          )}
          {isEdit ? 'Enregistrer' : "Créer l'association"}
        </Button>
      </div>
    </form>
  );
}
