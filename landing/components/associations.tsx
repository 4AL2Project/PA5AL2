'use client';

import { useState } from 'react';
import { FadeUp } from './fade-up';

export function Associations() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ nom: '', email: '', ville: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="associations" className="lp-section">
      <div className="lp-container">
        <div
          className="assoc-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}
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
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4A9B8E' }}>Pour les associations</span>
            </div>
            <h2
              style={{
                fontSize: 'clamp(26px,3vw,38px)',
                fontWeight: 800,
                letterSpacing: '-.03em',
                color: '#1A1A1A',
                marginBottom: 20,
              }}
            >
              Vous êtes une association ?
            </h2>
            <p style={{ fontSize: 16, color: '#6B7280', lineHeight: 1.7, marginBottom: 32 }}>
              Recevez des produits cosmétiques de qualité, directement des pharmacies proches de chez vous.
              Inscription gratuite. Notifications automatiques. Pickup confirmé en un scan.
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
                <div style={{ fontSize: 20, fontWeight: 800, color: '#4A9B8E', marginBottom: 8 }}>
                  Inscription reçue&nbsp;!
                </div>
                <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6 }}>
                  Nous vous contacterons sous 48h pour finaliser votre inscription au réseau Savely.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 380 }}
              >
                {[
                  { key: 'nom', placeholder: "Nom de l'association", type: 'text' },
                  { key: 'email', placeholder: 'Email de contact', type: 'email' },
                  { key: 'ville', placeholder: 'Ville', type: 'text' },
                ].map(({ key, placeholder, type }) => (
                  <input
                    key={key}
                    type={type}
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    required
                    style={{
                      padding: '13px 16px',
                      border: '1.5px solid #E5E7EB',
                      borderRadius: 10,
                      fontSize: 15,
                      outline: 'none',
                      color: '#1A1A1A',
                      transition: 'border-color .2s',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#4A9B8E')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
                  />
                ))}
                <button
                  type="submit"
                  style={{
                    background: '#4A9B8E',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    padding: '14px 24px',
                    borderRadius: 10,
                    transition: 'background .2s',
                    marginTop: 4,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#2D6B62')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#4A9B8E')}
                >
                  Inscrire mon association →
                </button>
              </form>
            )}
          </FadeUp>

          {/* Right: notification card mockup */}
          <FadeUp delay={0.12} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
                <div style={{ background: '#4A9B8E', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
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
                      <path d="M9 2L11 7H16L12 10.5L13.5 16L9 13L4.5 16L6 10.5L2 7H7L9 2Z" fill="#fff" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Nouvelle offre de don</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)' }}>Il y a 5 minutes</div>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: 20 }}>
                  {/* Pharmacy row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
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
                        <path d="M10 2C6.7 2 4 4.7 4 8c0 4 6 10 6 10s6-6 6-10c0-3.3-2.7-6-6-6z" fill="#4A9B8E" opacity=".3" />
                        <circle cx="10" cy="8" r="2.5" fill="#4A9B8E" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>Pharmacie du Centre</div>
                      <div style={{ fontSize: 12, color: '#6B7280' }}>Paris 11e · 2 km de vous</div>
                    </div>
                  </div>

                  {/* Products */}
                  <div
                    style={{
                      background: '#F8FFFE',
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 16,
                      border: '1px solid #EAF4F3',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 8 }}>Produits proposés</div>
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
                          alignItems: 'center',
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

                  {/* Time slot */}
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
                      Créneau pickup : <strong style={{ color: '#1A1A1A' }}>Lun 20 jan, 10h–12h</strong>
                    </span>
                  </div>

                  {/* CTA buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      style={{
                        background: '#4A9B8E',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 700,
                        padding: 11,
                        borderRadius: 10,
                        transition: 'background .2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#2D6B62')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#4A9B8E')}
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
                        transition: 'background .2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#EBEBEB')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#F5F5F5')}
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
