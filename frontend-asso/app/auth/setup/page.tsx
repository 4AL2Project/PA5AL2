'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { type AssoProfile, fetchProfile, updateProfile } from '@/lib/api';

const DAYS = [
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
] as const;
type Day = (typeof DAYS)[number];

type Window = { open: string; close: string } | null;
type Windows = Record<Day, Window>;

const DEFAULT_WINDOWS: Windows = {
  lundi: { open: '09:00', close: '17:00' },
  mardi: { open: '09:00', close: '17:00' },
  mercredi: null,
  jeudi: { open: '09:00', close: '17:00' },
  vendredi: { open: '09:00', close: '17:00' },
  samedi: { open: '10:00', close: '13:00' },
  dimanche: null,
};

const CATEGORIES = ['Cosmétiques', 'Parapharmacie', 'Hygiène', 'Autre'];

export default function SetupPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<AssoProfile | null>(null);
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [siteWeb, setSiteWeb] = useState('');
  const [categories, setCategories] = useState<string[]>([
    'Cosmétiques',
    'Parapharmacie',
  ]);
  const [windows, setWindows] = useState<Windows>(DEFAULT_WINDOWS);
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

  const toggleDay = (day: Day) =>
    setWindows((w) => ({
      ...w,
      [day]: w[day] ? null : { open: '09:00', close: '17:00' },
    }));

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    try {
      await updateProfile({
        name,
        address,
        contact_phone: phone || undefined,
        site_web: siteWeb || undefined,
        categories,
        pickup_windows: windows,
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
            {[1, 2, 3].map((s) => (
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
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-savely-500 focus:border-savely-500 outline-none"
                />
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
                disabled={!name || !address}
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
              <div className="space-y-2">
                {CATEGORIES.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-savely-400 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={categories.includes(cat)}
                      onChange={() => toggleCat(cat)}
                      className="w-4 h-4 text-savely-600 rounded"
                    />
                    <span className="text-sm text-gray-800">{cat}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  ← Retour
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-savely-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-savely-700 transition-colors"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h1 className="text-xl font-bold text-gray-900">
                Vos disponibilités
              </h1>
              <div className="space-y-2">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-gray-700 capitalize">
                      {day}
                    </span>
                    {windows[day] ? (
                      <>
                        <input
                          type="time"
                          value={windows[day]!.open}
                          onChange={(e) =>
                            setWindows((w) => ({
                              ...w,
                              [day]: { ...w[day]!, open: e.target.value },
                            }))
                          }
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <span className="text-gray-400">→</span>
                        <input
                          type="time"
                          value={windows[day]!.close}
                          onChange={(e) =>
                            setWindows((w) => ({
                              ...w,
                              [day]: { ...w[day]!, close: e.target.value },
                            }))
                          }
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => toggleDay(day)}
                          className="text-xs text-gray-400 hover:text-red-500"
                        >
                          Fermé
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => toggleDay(day)}
                        className="text-sm text-savely-600 hover:underline"
                      >
                        + Ouvrir
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  ← Retour
                </button>
                <button
                  onClick={handleFinish}
                  disabled={saving}
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
