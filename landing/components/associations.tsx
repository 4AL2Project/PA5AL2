'use client';

import { useState } from 'react';
import { FadeUp } from './fade-up';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005';

const CATEGORIES_OPTIONS = [
  'Cosmétiques',
  'Parapharmacie',
  'Hygiène',
  'Alimentation',
  'Habillement',
  'Autre',
];

type FormState = {
  name: string;
  rna_or_siren: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  postal_code: string;
  city: string;
  action_radius_km: number;
  categories: string[];
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
  categories: ['Cosmétiques', 'Parapharmacie'],
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

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#374151',
        }}
      >
        {label}
        {required && <span style={{ color: '#4A9B8E', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export function Associations() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(INITIAL);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleCat = (cat: string) =>
    set(
      'categories',
      form.categories.includes(cat)
        ? form.categories.filter((c) => c !== cat)
        : [...form.categories, cat]
    );

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
      form.categories.forEach((c) => fd.append('categories', c));
      if (form.logo) fd.append('logo', form.logo);

      const res = await fetch(`${API_BASE}/api/public/associations/register`, {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(
          payload?.message ?? `Erreur ${res.status}`
        );
      }
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Une erreur est survenue. Réessayez.'
      );
    } finally {
      setLoading(false);
    }
  };

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = '#4A9B8E');
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = '#E5E7EB');

  return (
    <section id="associations" className="lp-section">
      <div className="lp-container">
        <div
          className="assoc-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 72,
            alignItems: 'start',
          }}
        >
          {/* Left: form */}
          <FadeUp>
            <div
              style={{
                display: 'inline-block',
                background: '#F0F7F6',
                borderRadius: 100,
                padding: '6px 16px',
                marginBottom: 24,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4A9B8E' }}>
                Pour les associations
              </span>
            </div>
            <h2
              style={{
                fontSize: 'clamp(26px,3vw,38px)',
                fontWeight: 800,
                letterSpacing: '-.03em',
                color: '#1A1A1A',
                marginBottom: 16,
              }}
            >
              Vous êtes une association&nbsp;?
            </h2>
            <p
              style={{
                fontSize: 16,
                color: '#6B7280',
                lineHeight: 1.7,
                marginBottom: 28,
              }}
            >
              Recevez des produits cosmétiques de qualité, directement des
              pharmacies proches de chez vous. Inscription gratuite.
              Notifications automatiques. Pickup confirmé en un scan.
            </p>

            {submitted ? (
              <div
                style={{
                  background: '#F0F7F6',
                  borderRadius: 16,
                  padding: 28,
                  border: '2px solid #4A9B8E',
                }}
              >
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#4A9B8E',
                    marginBottom: 8,
                  }}
                >
                  Demande envoyée&nbsp;!
                </div>
                <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6 }}>
                  Vous recevrez un email de confirmation. Notre équipe validera
                  votre inscription sous 48&nbsp;h.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                {/* Row: nom + RNA */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Nom de l'association" required>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="Les Restos du Cœur Paris"
                      required
                      maxLength={200}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </Field>
                  <Field label="RNA ou SIREN" required>
                    <input
                      type="text"
                      value={form.rna_or_siren}
                      onChange={(e) => set('rna_or_siren', e.target.value)}
                      placeholder="W751234567"
                      required
                      maxLength={20}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </Field>
                </div>

                {/* Row: email + téléphone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Email de contact" required>
                    <input
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => set('contact_email', e.target.value)}
                      placeholder="contact@asso.fr"
                      required
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </Field>
                  <Field label="Téléphone" required>
                    <input
                      type="tel"
                      value={form.contact_phone}
                      onChange={(e) => set('contact_phone', e.target.value)}
                      placeholder="01 23 45 67 89"
                      required
                      maxLength={20}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </Field>
                </div>

                {/* Adresse */}
                <Field label="Adresse" required>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="12 rue de la Paix"
                    required
                    maxLength={300}
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </Field>

                {/* Row: code postal + ville */}
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
                  <Field label="Code postal" required>
                    <input
                      type="text"
                      value={form.postal_code}
                      onChange={(e) => set('postal_code', e.target.value)}
                      placeholder="75001"
                      required
                      maxLength={10}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </Field>
                  <Field label="Ville" required>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => set('city', e.target.value)}
                      placeholder="Paris"
                      required
                      maxLength={100}
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </Field>
                </div>

                {/* Rayon d'action */}
                <Field label={`Rayon d'action : ${form.action_radius_km} km`} required>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: '#9CA3AF', minWidth: 24 }}>5</span>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      step={5}
                      value={form.action_radius_km}
                      onChange={(e) => set('action_radius_km', Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#4A9B8E' }}
                    />
                    <span style={{ fontSize: 12, color: '#9CA3AF', minWidth: 32 }}>100 km</span>
                  </div>
                </Field>

                {/* Catégories */}
                <Field label="Catégories acceptées" required>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      paddingTop: 2,
                    }}
                  >
                    {CATEGORIES_OPTIONS.map((cat) => {
                      const active = form.categories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleCat(cat)}
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            padding: '6px 14px',
                            borderRadius: 100,
                            border: `1.5px solid ${active ? '#4A9B8E' : '#E5E7EB'}`,
                            background: active ? '#F0F7F6' : '#fff',
                            color: active ? '#4A9B8E' : '#6B7280',
                            cursor: 'pointer',
                            transition: 'all .15s',
                          }}
                        >
                          {active && '✓ '}
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                  {form.categories.length === 0 && (
                    <span style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>
                      Sélectionnez au moins une catégorie
                    </span>
                  )}
                </Field>

                {/* Logo (optionnel) */}
                <Field label="Logo (optionnel — JPG, PNG, WebP, max 5 Mo)">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    onChange={(e) => set('logo', e.target.files?.[0] ?? null)}
                    style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }}
                  />
                </Field>

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

                {/* Honeypot — ne pas remplir */}
                <input type="text" name="website" style={{ display: 'none' }} tabIndex={-1} />

                <button
                  type="submit"
                  disabled={loading || form.categories.length === 0}
                  style={{
                    background: '#4A9B8E',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    padding: '14px 24px',
                    borderRadius: 10,
                    transition: 'background .2s',
                    marginTop: 4,
                    opacity: loading || form.categories.length === 0 ? 0.6 : 1,
                    cursor:
                      loading || form.categories.length === 0
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.background = '#2D6B62';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#4A9B8E';
                  }}
                >
                  {loading ? 'Envoi en cours…' : 'Inscrire mon association →'}
                </button>
              </form>
            )}
          </FadeUp>

          {/* Right: notification card mockup */}
          <FadeUp
            delay={0.12}
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              paddingTop: 80,
            }}
          >
            <div style={{ maxWidth: 340, width: '100%' }}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  boxShadow: '0 16px 48px rgba(0,0,0,.1)',
                  border: '1px solid #EAF4F3',
                  overflow: 'hidden',
                }}
              >
                {/* Header */}
                <div
                  style={{
                    background: '#4A9B8E',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      background: 'rgba(255,255,255,.2)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path
                        d="M9 2L11 7H16L12 10.5L13.5 16L9 13L4.5 16L6 10.5L2 7H7L9 2Z"
                        fill="#fff"
                      />
                    </svg>
                  </div>
                  <div>
                    <div
                      style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}
                    >
                      Nouvelle offre de don
                    </div>
                    <div
                      style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}
                    >
                      Il y a 5 minutes
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        background: '#F0F7F6',
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M10 2C6.7 2 4 4.7 4 8c0 4 6 10 6 10s6-6 6-10c0-3.3-2.7-6-6-6z"
                          fill="#4A9B8E"
                          opacity=".3"
                        />
                        <circle cx="10" cy="8" r="2.5" fill="#4A9B8E" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>
                        Pharmacie du Centre
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>
                        Paris 11e · 2 km de vous
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#F8FFFE',
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 16,
                      border: '1px solid #EAF4F3',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#1A1A1A',
                        marginBottom: 8,
                      }}
                    >
                      Produits proposés
                    </div>
                    {[
                      ['Crème solaire SPF50', '×3'],
                      ['Sérum vitamine C', '×2'],
                      ['Hydratant visage', '×1'],
                    ].map(([name, qty]) => (
                      <div
                        key={name}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 13,
                          color: '#6B7280',
                          marginBottom: 6,
                        }}
                      >
                        <span>{name}</span>
                        <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{qty}</span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#FFF8EE',
                      borderRadius: 10,
                      padding: '10px 12px',
                      marginBottom: 16,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="#F5A623" strokeWidth="1.5" />
                      <path d="M8 5v3l2 2" stroke="#F5A623" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span style={{ fontSize: 13, color: '#6B7280' }}>
                      Créneau pickup :{' '}
                      <strong style={{ color: '#1A1A1A' }}>Lun 20 jan, 10h–12h</strong>
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      style={{
                        background: '#4A9B8E',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 700,
                        padding: 11,
                        borderRadius: 10,
                      }}
                    >
                      ✓ Accepter
                    </button>
                    <button
                      style={{
                        background: '#F5F5F5',
                        color: '#6B7280',
                        fontSize: 13,
                        fontWeight: 600,
                        padding: 11,
                        borderRadius: 10,
                      }}
                    >
                      ✕ Refuser
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
