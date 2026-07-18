'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { type AssoProfile, fetchProfile, updateProfile } from '@/lib/api';

const CATEGORIES = [
  'Cosmétiques',
  'Soins visage',
  'Soins corps',
  'Dermatologie',
  'Hygiène',
  'Maquillage',
  'Capillaire',
  'Solaire',
  'Parfumerie',
  'Compléments alimentaires',
  'Pédiatrie',
  'Parapharmacie',
  'Autre',
];

interface AdresseSuggestion {
  label: string;
  housenumber?: string;
  name: string;
  postcode: string;
  city: string;
}

function AddressAutocomplete({
  value,
  onChange,
  onSelect,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: AdresseSuggestion) => void;
}) {
  const [suggestions, setSuggestions] = useState<AdresseSuggestion[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);

  const search = useCallback((q: string) => {
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`
    )
      .then((r) => r.json())
      .then((data) => {
        const hits: AdresseSuggestion[] = (data.features ?? []).map(
          (f: { properties: Record<string, string> }) => ({
            label: f.properties.label,
            name: f.properties.name,
            postcode: f.properties.postcode,
            city: f.properties.city,
          })
        );
        setSuggestions(hits);
        setOpen(hits.length > 0);
      })
      .catch(() => {});
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => search(v), 350);
  };

  const pick = (s: AdresseSuggestion) => {
    onChange(s.name);
    onSelect(s);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="12 rue de la Paix"
        required
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-savely-500 focus:border-savely-500 outline-none"
      />
      {open && (
        <ul className="absolute z-50 left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li key={s.label}>
              <button
                type="button"
                onMouseDown={() => pick(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-savely-50 text-gray-800"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AssoProfile | null>(null);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [siteWeb, setSiteWeb] = useState('');
  const [categories, setCategories] = useState<string[]>([
    'Cosmétiques',
    'Parapharmacie',
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('savely_asso_token');
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    fetchProfile()
      .then((p) => {
        setProfile(p);
        setName(p.name);
        setAddress(p.address);
        setPostalCode(p.postal_code ?? '');
        setCity(p.city ?? '');
        setPhone(p.contact_phone ?? '');
        setSiteWeb(p.site_web ?? '');
        if (p.categories?.length) setCategories(p.categories);
      })
      .catch(() => router.replace('/auth/login'));
  }, [router]);

  const toggleCat = (cat: string) =>
    setCategories((c) =>
      c.includes(cat) ? c.filter((x) => x !== cat) : [...c, cat]
    );

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    try {
      await updateProfile({
        name,
        address,
        postal_code: postalCode,
        city,
        contact_phone: phone || undefined,
        site_web: siteWeb || undefined,
        categories,
      });
      router.replace('/offres');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (!profile)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-savely-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex gap-1 mb-8">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-savely-600' : 'bg-gray-200'}`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-5">
              <h1 className="text-xl font-bold text-gray-900">
                Vos informations
              </h1>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'association *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-savely-500 focus:border-savely-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse *
                </label>
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  onSelect={(s) => {
                    setAddress(s.name);
                    setPostalCode(s.postcode);
                    setCity(s.city);
                  }}
                />
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code postal *
                  </label>
                  <input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="75001"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-savely-500 focus:border-savely-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville *
                  </label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Paris"
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-savely-500 focus:border-savely-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-savely-500 focus:border-savely-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site web
                </label>
                <input
                  value={siteWeb}
                  onChange={(e) => setSiteWeb(e.target.value)}
                  placeholder="https://"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-savely-500 focus:border-savely-500 outline-none"
                />
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!name || !address || !postalCode || !city}
                className="w-full bg-savely-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-savely-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Suivant →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h1 className="text-xl font-bold text-gray-900">
                Catégories acceptées
              </h1>
              <p className="text-sm text-gray-500">
                Sélectionnez les types de produits que vous êtes en mesure de
                réceptionner.
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCat(cat)}
                    className={`text-sm font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      categories.includes(cat)
                        ? 'bg-savely-50 border-savely-400 text-savely-700'
                        : 'border-gray-200 text-gray-600 hover:border-savely-300'
                    }`}
                  >
                    {categories.includes(cat) && '✓ '}
                    {cat}
                  </button>
                ))}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  ← Retour
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving || categories.length === 0}
                  className="flex-1 bg-savely-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-savely-700 disabled:opacity-40 transition-colors"
                >
                  {saving ? 'Enregistrement…' : 'Finaliser mon inscription'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
