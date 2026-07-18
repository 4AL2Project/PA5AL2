'use client';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AssoLayout } from '@/components/asso-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type AssoProfile, fetchProfile, updateProfile } from '@/lib/api';

const CATEGORIES = ['Cosmétiques', 'Parapharmacie', 'Hygiène', 'Autre'];

export default function ProfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AssoProfile | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [siteWeb, setSiteWeb] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [pickupWindows, setPickupWindows] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('savely_asso_token')) {
      router.replace('/auth/login');
      return;
    }
    fetchProfile()
      .then((p) => {
        setProfile(p);
        setName(p.name);
        setAddress(p.address);
        setPhone(p.contact_phone ?? '');
        setSiteWeb(p.site_web ?? '');
        setDescription(p.description ?? '');
        setCategories(p.categories ?? []);
        setPickupWindows(p.pickup_windows);
      })
      .catch(() => router.replace('/auth/login'));
  }, [router]);

  const toggleCat = (cat: string) =>
    setCategories((c) =>
      c.includes(cat) ? c.filter((x) => x !== cat) : [...c, cat]
    );

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      const updated = await updateProfile({
        name,
        address,
        contact_phone: phone,
        site_web: siteWeb,
        description,
        categories,
        pickup_windows: pickupWindows,
      });
      setProfile(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  if (!profile)
    return (
      <AssoLayout title="Mon association">
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </AssoLayout>
    );

  return (
    <AssoLayout
      title="Mon association"
      description={profile.contact_email ?? undefined}
    >
      <div className="max-w-2xl space-y-4">
        {/* Informations */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Informations
          </h2>
          <div className="space-y-4">
            {[
              {
                label: 'Nom',
                value: name,
                set: setName,
                type: 'text' as const,
              },
              {
                label: 'Adresse',
                value: address,
                set: setAddress,
                type: 'text' as const,
              },
              {
                label: 'Téléphone',
                value: phone,
                set: setPhone,
                type: 'tel' as const,
              },
              {
                label: 'Site web',
                value: siteWeb,
                set: setSiteWeb,
                type: 'url' as const,
              },
            ].map(({ label, value, set, type }) => (
              <div key={label}>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  {label}
                </label>
                <Input
                  type={type}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                />
              </div>
            ))}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        {/* Catégories */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Catégories acceptées
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const checked = categories.includes(cat);
              return (
                <label
                  key={cat}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    checked
                      ? 'border-primary bg-primary-tint'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCat(cat)}
                    className="sr-only"
                  />
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border-2 transition-colors ${
                      checked
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    }`}
                  >
                    {checked && (
                      <Check
                        className="h-2.5 w-2.5 text-primary-foreground"
                        strokeWidth={3}
                      />
                    )}
                  </div>
                  <span className="text-sm text-foreground">{cat}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <Check className="h-4 w-4 shrink-0" />
            Modifications enregistrées
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="w-full"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </Button>
      </div>
    </AssoLayout>
  );
}
