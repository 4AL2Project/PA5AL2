'use client';

import { useEffect, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type State = 'idle' | 'loading' | 'success' | 'error';

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  border: '1px solid #E5E7EB',
  borderRadius: 10,
  fontSize: 13,
  outline: 'none',
  color: '#1A1A1A',
  width: '100%',
  transition: 'border-color .2s, box-shadow .2s',
  background: '#FAFAFA',
  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)',
};

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    pharmacy_name: '',
    pharmacy_count: 1,
    message: '',
  });

  const set = (k: string, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  // Fermer avec Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Bloquer le scroll body
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/public/demo-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.message ?? `Erreur ${res.status}`);
      }
      setState('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
      setState('error');
    }
  };

  if (!isOpen) return null;

  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = '#009689');
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = '#E5E7EB');

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
          maxWidth: 520,
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

        {state === 'success' ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: 56,
                height: 56,
                background: '#e8f9f6',
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
                  stroke="#009689"
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
              Merci {form.first_name}. Notre équipe vous contactera sous
              24&nbsp;h à l'adresse{' '}
              <strong style={{ color: '#1A1A1A' }}>{form.email}</strong>.
            </p>
            <button
              onClick={onClose}
              style={{
                marginTop: 24,
                background: '#009689',
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
            <div style={{ marginBottom: 8 }}>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#1A1A1A',
                  marginBottom: 6,
                  letterSpacing: '-.02em',
                }}
              >
                Demander une démo
              </h2>
              <p style={{ fontSize: 14, color: '#6B7280' }}>
                Renseignez vos coordonnées et notre équipe vous rappelle sous
                24&nbsp;h.
              </p>
            </div>

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
                  Prénom <span style={{ color: '#009689' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)}
                  placeholder="Marie"
                  required
                  maxLength={100}
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
                >
                  Nom <span style={{ color: '#009689' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                  placeholder="Dupont"
                  required
                  maxLength={100}
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </div>
            </div>

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
                  Email <span style={{ color: '#009689' }}>*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="marie@pharmacie.fr"
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
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="06 12 34 56 78"
                  maxLength={20}
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 10,
                alignItems: 'end',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
                >
                  Nom de l'officine / groupement{' '}
                  <span style={{ color: '#009689' }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.pharmacy_name}
                  onChange={(e) => set('pharmacy_name', e.target.value)}
                  placeholder="Pharmacie du Marché"
                  required
                  maxLength={200}
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  minWidth: 100,
                }}
              >
                <label
                  style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
                >
                  Nb officines
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={form.pharmacy_count}
                  onChange={(e) =>
                    set('pharmacy_count', Number(e.target.value))
                  }
                  style={inputStyle}
                  onFocus={focus}
                  onBlur={blur}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label
                style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
              >
                Message (optionnel)
              </label>
              <textarea
                value={form.message}
                onChange={(e) => set('message', e.target.value)}
                placeholder="Décrivez votre situation ou vos questions..."
                rows={3}
                maxLength={1000}
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
                onFocus={focus}
                onBlur={blur}
              />
            </div>

            {state === 'error' && (
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

            <button
              type="submit"
              disabled={state === 'loading'}
              style={{
                background: '#009689',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                padding: '14px 24px',
                borderRadius: 10,
                cursor: state === 'loading' ? 'not-allowed' : 'pointer',
                opacity: state === 'loading' ? 0.7 : 1,
                transition: 'background .2s, opacity .2s',
                marginTop: 4,
              }}
              onMouseEnter={(e) => {
                if (state !== 'loading')
                  e.currentTarget.style.background = '#00786c';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#009689';
              }}
            >
              {state === 'loading' ? 'Envoi…' : 'Demander ma démo →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
