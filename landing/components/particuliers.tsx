'use client';

import { useState } from 'react';
import { FadeUp } from './fade-up';

export function Particuliers() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="particuliers" style={{ background: '#F0F7F6', paddingTop: 72, paddingBottom: 72 }}>
      <div className="lp-container">
        <FadeUp style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              background: '#fff',
              borderRadius: 100,
              padding: '6px 16px',
              marginBottom: 20,
              border: '1px solid #EAF4F3',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6B7280' }}>Bientôt disponible</span>
          </div>
          <h2
            style={{
              fontSize: 'clamp(22px,2.8vw,32px)',
              fontWeight: 800,
              letterSpacing: '-.03em',
              color: '#1A1A1A',
              marginBottom: 14,
            }}
          >
            Vous cherchez des produits à prix réduit&nbsp;?
          </h2>
          <p style={{ fontSize: 16, color: '#6B7280', lineHeight: 1.65, marginBottom: 28 }}>
            Savely propose bientôt des offres exclusives sur les produits cosmétiques des pharmacies
            partenaires près de chez vous.
          </p>

          {submitted ? (
            <div
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: '20px 28px',
                border: '2px solid #4A9B8E',
                display: 'inline-block',
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, color: '#4A9B8E' }}>
                Vous serez parmi les premiers prévenus&nbsp;!
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{
                display: 'flex',
                gap: 10,
                maxWidth: 460,
                margin: '0 auto 20px',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="email"
                placeholder="Votre email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  flex: 1,
                  minWidth: 200,
                  padding: '13px 16px',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: 10,
                  fontSize: 15,
                  outline: 'none',
                  background: '#fff',
                  color: '#1A1A1A',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#4A9B8E')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
              />
              <button
                type="submit"
                style={{
                  background: '#4A9B8E',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  padding: '13px 22px',
                  borderRadius: 10,
                  whiteSpace: 'nowrap',
                  transition: 'background .2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#2D6B62')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#4A9B8E')}
              >
                Je veux être prévenu(e)
              </button>
            </form>
          )}

          {/* App store badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            {[
              { label: 'App Store · Prochainement' },
              { label: 'Google Play · Prochainement' },
            ].map(({ label }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  padding: '9px 16px',
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    background: '#C7C7CC',
                    borderRadius: 4,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#9CA3AF' }}>{label}</span>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
