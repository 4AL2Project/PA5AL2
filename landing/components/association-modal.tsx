'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005';

const isValidSiren = (siren: string) =>
  /^\d{9}$/.test(siren.replace(/\s/g, ''));

interface AssociationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FormState = {
  name: string;
  rna_or_siren: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  postal_code: string;
  city: string;
  action_radius_km: number;
  logo: File | null;
};

const INITIAL: FormState = {
  name: '',
  rna_or_siren: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  postal_code: '',
  city: '',
  action_radius_km: 30,
  logo: null,
};

const inputStyle: React.CSSProperties = {
  padding: '11px 14px',
  border: '1.5px solid #E5E7EB',
  borderRadius: 10,
  fontSize: 14,
  outline: 'none',
  color: '#1A1A1A',
  width: '100%',
  transition: 'border-color .2s',
  background: '#fff',
};

interface AdresseSuggestion {
  label: string;
  name: string;
  postcode: string;
  city: string;
}

export function AssociationModal({ isOpen, onClose }: AssociationModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(INITIAL);
  const [addrSuggestions, setAddrSuggestions] = useState<AdresseSuggestion[]>(
    []
  );
  const [addrOpen, setAddrOpen] = useState(false);
  const addrTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchAddress = useCallback((q: string) => {
    if (q.length < 3) {
      setAddrSuggestions([]);
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
        setAddrSuggestions(hits);
        setAddrOpen(hits.length > 0);
      })
      .catch(() => {});
  }, []);

  const handleAddressChange = (v: string) => {
    set('address', v);
    if (addrTimer.current) clearTimeout(addrTimer.current);
    addrTimer.current = setTimeout(() => searchAddress(v), 350);
  };

  const pickAddress = (s: AdresseSuggestion) => {
    setForm((f) => ({
      ...f,
      address: s.name,
      postal_code: s.postcode,
      city: s.city,
    }));
    setAddrSuggestions([]);
    setAddrOpen(false);
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setSubmitted(false);
      setError('');
      setForm(INITIAL);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('rna_or_siren', form.rna_or_siren);
      fd.append('contact_email', form.contact_email);
      fd.append('contact_phone', form.contact_phone);
      fd.append('address', form.address);
      fd.append('postal_code', form.postal_code);
      fd.append('city', form.city);
      fd.append('action_radius_km', String(form.action_radius_km));
      if (form.logo) fd.append('logo', form.logo);

      const res = await fetch(`${API_BASE}/api/public/associations/register`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message ?? `Erreur ${res.status}`);
      }
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue. Réessayez.'
      );
    } finally {
      setLoading(false);
    }
  };

  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = '#4A9B8E');
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = '#E5E7EB');

  const sirenFilled = form.rna_or_siren.trim().length > 0;
  const sirenInvalid = sirenFilled && !isValidSiren(form.rna_or_siren);
  const submitDisabled = loading || (sirenFilled && sirenInvalid);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,.5)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'relative',
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 24px 64px rgba(0,0,0,.18)',
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '36px 32px',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            background: '#F3F4F6',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            color: '#6B7280',
          }}
        >
          ×
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: 56,
                height: 56,
                background: '#F0F7F6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#4A9B8E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#1A1A1A',
                marginBottom: 12,
              }}
            >
              Demande envoyée !
            </h2>
            <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6 }}>
              Votre inscription a bien été reçue. Notre équipe validera votre
              dossier sous 48&nbsp;h et vous contactera à l'adresse{' '}
              <strong style={{ color: '#1A1A1A' }}>{form.contact_email}</strong>
              .
            </p>
            <button
              onClick={onClose}
              style={{
                marginTop: 24,
                background: '#4A9B8E',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                padding: '12px 24px',
                borderRadius: 10,
                cursor: 'pointer',
              }}
            >
              Fermer
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div style={{ marginBottom: 4 }}>
              <div
                style={{
                  display: 'inline-block',
                  background: '#F0F7F6',
                  borderRadius: 100,
                  padding: '4px 12px',
                  marginBottom: 10,
                }}
              >
                <span
                  style={{ fontSize: 12, fontWeight: 600, color: '#4A9B8E' }}
                >
                  Inscription gratuite
                </span>
              </div>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#1A1A1A',
                  marginBottom: 6,
                  letterSpacing: '-.02em',
                }}
              >
                Inscrire mon association
              </h2>
              <p style={{ fontSize: 14, color: '#6B7280' }}>
                Tous les champs marqués{' '}
                <span style={{ color: '#4A9B8E' }}>*</span> sont obligatoires.
              </p>
            </div>

            {/* Nom + SIREN */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
                >
                  Nom de l'association{' '}
                  <span style={{ color: '#4A9B8E' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Les Restos du Cœur Paris"
                  required
                  maxLength={200}
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
                >
                  SIREN
                </label>
                <input
                  type="text"
                  value={form.rna_or_siren}
                  onChange={(e) => set('rna_or_siren', e.target.value)}
                  placeholder="123 456 789"
                  maxLength={20}
                  style={{
                    ...inputStyle,
                    borderColor: sirenInvalid ? '#EF4444' : '#E5E7EB',
                  }}
                  onFocus={focus}
                  onBlur={blur}
                />
                {sirenInvalid ? (
                  <p style={{ fontSize: 12, color: '#EF4444', margin: 0 }}>
                    SIREN invalide — 9 chiffres requis
                  </p>
                ) : (
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                    Votre numéro SIREN à 9 chiffres (visible sur Kbis ou avis de
                    situation INSEE)
                  </p>
                )}
              </div>
            </div>

            {/* Email + Téléphone */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
                >
                  Email de contact <span style={{ color: '#4A9B8E' }}>*</span>
                </label>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => set('contact_email', e.target.value)}
                  placeholder="contact@asso.fr"
                  required
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
                >
                  Téléphone <span style={{ color: '#4A9B8E' }}>*</span>
                </label>
                <input
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => set('contact_phone', e.target.value)}
                  placeholder="01 23 45 67 89"
                  required
                  maxLength={20}
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </div>
            </div>

            {/* Adresse */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label
                style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
              >
                Adresse <span style={{ color: '#4A9B8E' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onBlur={(e) => {
                    blur(e);
                    setTimeout(() => setAddrOpen(false), 150);
                  }}
                  onFocus={(e) => {
                    focus(e);
                    if (addrSuggestions.length > 0) setAddrOpen(true);
                  }}
                  placeholder="12 rue de la Paix"
                  required
                  maxLength={300}
                  style={inputStyle}
                />
                {addrOpen && addrSuggestions.length > 0 && (
                  <ul
                    style={{
                      position: 'absolute',
                      zIndex: 100,
                      left: 0,
                      right: 0,
                      top: '100%',
                      marginTop: 4,
                      background: '#fff',
                      border: '1.5px solid #E5E7EB',
                      borderRadius: 10,
                      boxShadow: '0 8px 24px rgba(0,0,0,.1)',
                      listStyle: 'none',
                      padding: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {addrSuggestions.map((s) => (
                      <li key={s.label}>
                        <button
                          type="button"
                          onMouseDown={() => pickAddress(s)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '10px 14px',
                            fontSize: 13,
                            color: '#374151',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            borderBottom: '1px solid #F3F4F6',
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = '#F0F7F6')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = 'none')
                          }
                        >
                          {s.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* CP + Ville */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
                >
                  Code postal <span style={{ color: '#4A9B8E' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.postal_code}
                  onChange={(e) => set('postal_code', e.target.value)}
                  placeholder="75001"
                  required
                  maxLength={10}
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
                >
                  Ville <span style={{ color: '#4A9B8E' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder="Paris"
                  required
                  maxLength={100}
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </div>
            </div>

            {/* Rayon */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label
                style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
              >
                Rayon d'action :{' '}
                <strong style={{ color: '#4A9B8E' }}>
                  {form.action_radius_km} km
                </strong>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#9CA3AF', minWidth: 24 }}>
                  5
                </span>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={form.action_radius_km}
                  onChange={(e) =>
                    set('action_radius_km', Number(e.target.value))
                  }
                  style={{ flex: 1, accentColor: '#4A9B8E' }}
                />
                <span style={{ fontSize: 12, color: '#9CA3AF', minWidth: 32 }}>
                  100 km
                </span>
              </div>
            </div>

            {/* Logo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label
                style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
              >
                Logo (optionnel — JPG, PNG, WebP, max 5 Mo)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                onChange={(e) => set('logo', e.target.files?.[0] ?? null)}
                style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }}
              />
            </div>

            {error && (
              <p
                style={{
                  fontSize: 13,
                  color: '#EF4444',
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 8,
                  padding: '10px 14px',
                }}
              >
                {error}
              </p>
            )}

            {/* Honeypot */}
            <input
              type="text"
              name="website"
              style={{ display: 'none' }}
              tabIndex={-1}
            />

            <button
              type="submit"
              disabled={submitDisabled}
              style={{
                background: '#4A9B8E',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                padding: '14px 24px',
                borderRadius: 10,
                cursor: submitDisabled ? 'not-allowed' : 'pointer',
                opacity: submitDisabled ? 0.6 : 1,
                transition: 'background .2s, opacity .2s',
              }}
              onMouseEnter={(e) => {
                if (!submitDisabled)
                  e.currentTarget.style.background = '#2D6B62';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#4A9B8E';
              }}
            >
              {loading ? 'Envoi en cours…' : 'Inscrire mon association →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
