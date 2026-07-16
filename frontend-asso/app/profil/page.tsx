'use client';
import { Check, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Shell from '@/components/shell';
import { type AssoProfile, fetchProfile, updateProfile } from '@/lib/api';

const CATEGORIES = ['Cosmétiques', 'Parapharmacie', 'Hygiène', 'Autre'];

function Spinner() {
  return (
    <Shell>
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-savely-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </Shell>
  );
}

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
      router.replace('/auth/verify');
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
      .catch(() => router.replace('/auth/verify'));
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

  if (!profile) return <Spinner />;

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-savely-500 focus:border-savely-500 outline-none transition-shadow';

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Mon association</h1>
        {profile.contact_email && (
          <p className="text-sm text-gray-500 mt-1">{profile.contact_email}</p>
        )}
      </div>

      <div className="max-w-2xl space-y-4">
        {/* Informations */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
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
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {label}
                </label>
                <input
                  type={type}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className={inputClass}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Catégories */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Catégories acceptées
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const checked = categories.includes(cat);
              return (
                <label
                  key={cat}
                  className={`flex items-center gap-3 cursor-pointer rounded-lg border p-3 transition-colors ${
                    checked
                      ? 'border-savely-400 bg-savely-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCat(cat)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-colors ${
                      checked
                        ? 'bg-savely-600 border-savely-600'
                        : 'border-gray-300'
                    }`}
                  >
                    {checked && (
                      <Check
                        className="w-2.5 h-2.5 text-white"
                        strokeWidth={3}
                      />
                    )}
                  </div>
                  <span className="text-sm text-gray-700">{cat}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Feedback */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {saved && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            Modifications enregistrées
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-savely-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-savely-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </div>
    </Shell>
  );
}
