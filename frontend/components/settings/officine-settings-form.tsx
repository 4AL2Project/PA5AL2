'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { AddressAutocomplete } from '@/components/address-autocomplete';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coords, geocodeAddress } from '@/lib/address';
import { MyPharmacy } from '@/lib/pharmacy';

export function OfficineSettingsForm({ pharmacy }: { pharmacy: MyPharmacy }) {
  const router = useRouter();
  const [name, setName] = useState(pharmacy.name ?? '');
  const [address, setAddress] = useState(pharmacy.address ?? '');
  const [saving, setSaving] = useState(false);
  // Coordonnées issues de la BAN, synchronisées avec `address`. Réinitialisées
  // dès que l'utilisateur ressaisit manuellement (elles seront alors re-géocodées au submit).
  const [coords, setCoords] = useState<Coords | null>(
    pharmacy.lat != null && pharmacy.lng != null
      ? { lat: pharmacy.lat, lng: pharmacy.lng }
      : null
  );

  const dirty =
    name.trim() !== (pharmacy.name ?? '') ||
    address.trim() !== (pharmacy.address ?? '');
  const canSave = dirty && name.trim().length > 0 && !saving;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const trimmedAddress = address.trim();
      const addressChanged = trimmedAddress !== (pharmacy.address ?? '');

      const body: {
        name: string;
        address: string;
        lat?: number;
        lng?: number;
      } = {
        name: name.trim(),
        address: trimmedAddress,
      };

      // Quand l'adresse change, on (re)synchronise lat/lng depuis la BAN : coordonnées
      // de la suggestion choisie, sinon géocodage de l'adresse saisie manuellement.
      if (addressChanged && trimmedAddress.length > 0) {
        const resolved = coords ?? (await geocodeAddress(trimmedAddress));
        if (resolved) {
          body.lat = resolved.lat;
          body.lng = resolved.lng;
        }
      }

      const res = await fetch('/api/be/api/pharmacies/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error("Impossible d'enregistrer les modifications");
        return;
      }
      toast.success("Informations de l'officine mises à jour");
      router.refresh();
    } catch {
      toast.error("Impossible d'enregistrer les modifications");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-3">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Informations de l'officine</CardTitle>
          <CardDescription>
            Mettez à jour le nom et l'adresse de votre officine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom de l'officine</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pharmacie du Centre"
              disabled={saving}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Adresse</Label>
            <AddressAutocomplete
              id="address"
              value={address}
              onChange={(value, nextCoords) => {
                setAddress(value);
                setCoords(nextCoords);
              }}
              placeholder="12 rue de la Paix, 75002 Paris"
              disabled={saving}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="siret">SIRET</Label>
              <Input id="siret" value={pharmacy.siret ?? '—'} disabled />
              <p className="text-xs text-muted-foreground">
                Le SIRET ne peut pas être modifié.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email de l'officine</Label>
              <Input id="email" value={pharmacy.email ?? '—'} disabled />
              <p className="text-xs text-muted-foreground">
                Contactez Savely pour changer cette adresse.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex max-w-2xl justify-end">
        <Button type="submit" disabled={!canSave}>
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Enregistrer les modifications
        </Button>
      </div>
    </form>
  );
}
