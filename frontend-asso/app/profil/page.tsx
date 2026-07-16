'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import Shell from '@/components/shell';
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

  if (!profile)
    return (
      <Shell>
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-savely-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </Shell>
    );

  return (
    <Shell>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon association</h1>

      <div className="max-w-2xl space-y-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
            Informations
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {[
              { label: 'Nom', value: name, set: setName },
              { label: 'Adresse', value: address, set: setAddress },
              { label: 'Téléphone', value: phone, set: setPhone },
              { label: 'Site web', value: siteWeb, set: setSiteWeb },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {label}
                </label>
                <input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-savely-500 focus:border-savely-500 outline-none"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-savely-500 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
            Catégories acceptées
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => (
              <label
                key={cat}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={categories.includes(cat)}
                  onChange={() => toggleCat(cat)}
                  className="w-4 h-4 text-savely-600 rounded"
                />
                <span className="text-sm text-gray-700">{cat}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            {error}
          </p>
        )}
        {saved && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            ✅ Modifications enregistrées
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-savely-600 text-white py-3 rounded-xl font-semibold hover:bg-savely-700 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </div>
    </Shell>
  );
}
