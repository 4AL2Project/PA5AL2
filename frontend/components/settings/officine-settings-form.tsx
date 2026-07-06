'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
import { MyPharmacy } from '@/lib/pharmacy';

interface Coords {
  lat: number;
  lng: number;
}

interface AddressSuggestion {
  label: string;
  postcode: string;
  city: string;
  coords: Coords | null;
}

interface BanFeature {
  geometry?: { coordinates: [number, number] };
  properties: {
    label: string;
    postcode?: string;
    city?: string;
  };
}

/** Extrait les coordonnées WGS84 (lat/lng) d'une feature GeoJSON de la BAN. */
function coordsFromFeature(f: BanFeature): Coords | null {
  const c = f.geometry?.coordinates;
  if (!c) return null;
  const [lng, lat] = c;
  return { lat, lng };
}

/** Géocode une adresse libre via la BAN et renvoie ses coordonnées (ou null). */
async function geocodeAddress(query: string): Promise<Coords | null> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
        query
      )}&limit=1`
    );
    const payload = (await res.json().catch(() => null)) as {
      features?: BanFeature[];
    } | null;
    const first = payload?.features?.[0];
    return first ? coordsFromFeature(first) : null;
  } catch {
    return null;
  }
}

export function OfficineSettingsForm({ pharmacy }: { pharmacy: MyPharmacy }) {
  const router = useRouter();
  const [name, setName] = useState(pharmacy.name ?? '');
  const [address, setAddress] = useState(pharmacy.address ?? '');
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(false);
  // Coordonnées issues de la BAN, synchronisées avec `address`. Réinitialisées
  // dès que l'utilisateur ressaisit manuellement (elles seront alors re-géocodées au submit).
  const [coords, setCoords] = useState<Coords | null>(
    pharmacy.lat != null && pharmacy.lng != null
      ? { lat: pharmacy.lat, lng: pharmacy.lng }
      : null
  );

  // Autocomplétion d'adresse via la Base Adresse Nationale (api-adresse.data.gouv.fr),
  // avec debounce + annulation de la requête obsolète — même pattern que le drawer de création.
  useEffect(() => {
    const q = address.trim();
    if (picked || q.length < 3) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
            q
          )}&limit=5`,
          { signal: controller.signal }
        );
        const payload = (await res.json().catch(() => null)) as {
          features?: BanFeature[];
        } | null;
        const list: AddressSuggestion[] = (payload?.features ?? []).map(
          (f) => ({
            label: f.properties.label,
            postcode: f.properties.postcode ?? '',
            city: f.properties.city ?? '',
            coords: coordsFromFeature(f),
          })
        );
        setSuggestions(list);
      } catch {
        // requête annulée ou réseau indisponible — on ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [address, picked]);

  const pickAddress = (s: AddressSuggestion) => {
    setPicked(true);
    setAddress(s.label);
    setCoords(s.coords);
    setSuggestions([]);
  };

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
      toast.success('Informations de l’officine mises à jour');
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
          <CardTitle>Informations de l’officine</CardTitle>
          <CardDescription>
            Mettez à jour le nom et l’adresse de votre officine.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nom de l’officine</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pharmacie du Centre"
              disabled={saving}
              required
            />
          </div>
          <div className="relative space-y-1.5">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={address}
              autoComplete="off"
              onChange={(e) => {
                setPicked(false);
                setCoords(null);
                setAddress(e.target.value);
              }}
              placeholder="12 rue de la Paix, 75002 Paris"
              disabled={saving}
            />
            {searching && (
              <Loader2 className="absolute right-2.5 top-[31px] h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
            {suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-60 overflow-auto rounded-md border bg-card shadow-md">
                {suggestions.map((s) => (
                  <li key={s.label} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() => pickAddress(s)}
                      className="w-full px-3 py-2 text-left hover:bg-muted/50"
                    >
                      <span className="block text-xs font-medium">
                        {s.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
              <Label htmlFor="email">Email de l’officine</Label>
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
