'use client';

import { useState } from 'react';
import { AssociationModal } from './association-modal';
import { FadeUp } from './fade-up';

export function Associations() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section id="associations" className="lp-section">
        <div className="lp-container">
          <div
            className="assoc-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 72,
              alignItems: 'center',
            }}
          >
            {/* Left: pitch + CTA */}
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
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: '#4A9B8E' }}
                >
                  Pour les associations
                </span>
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
                Vous êtes une association&nbsp;?
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: '#6B7280',
                  lineHeight: 1.7,
                  marginBottom: 16,
                }}
              >
                Recevez des produits cosmétiques de qualité, directement des
                pharmacies proches de chez vous.
              </p>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {[
                  'Inscription gratuite, sans engagement',
                  "Notifications automatiques dès qu'une offre correspond",
                  'Pickup confirmé en un scan QR — Cerfa inclus',
                  'Réseau de pharmacies partenaires en France entière',
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      fontSize: 15,
                      color: '#374151',
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        marginTop: 2,
                        width: 20,
                        height: 20,
                        background: '#F0F7F6',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 11 11"
                        fill="none"
                      >
                        <path
                          d="M2 5.5l2.5 2.5 4.5-4.5"
                          stroke="#4A9B8E"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => setModalOpen(true)}
                style={{
                  background: '#4A9B8E',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  padding: '15px 28px',
                  borderRadius: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  transition: 'background .2s',
                  boxShadow: '0 4px 16px rgba(74,155,142,.3)',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = '#2D6B62')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = '#4A9B8E')
                }
              >
                Inscrire mon association →
              </button>

              <p
                style={{
                  fontSize: 13,
                  color: '#9CA3AF',
                  marginTop: 12,
                }}
              >
                Validation sous 48 h · Aucun engagement
              </p>
            </FadeUp>

            {/* Right: notification card mockup */}
            <FadeUp
              delay={0.12}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
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
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                      >
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
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                        >
                          <path
                            d="M10 2C6.7 2 4 4.7 4 8c0 4 6 10 6 10s6-6 6-10c0-3.3-2.7-6-6-6z"
                            fill="#4A9B8E"
                            opacity=".3"
                          />
                          <circle cx="10" cy="8" r="2.5" fill="#4A9B8E" />
                        </svg>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#1A1A1A',
                          }}
                        >
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
                          <span style={{ fontWeight: 600, color: '#1A1A1A' }}>
                            {qty}
                          </span>
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
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <circle
                          cx="8"
                          cy="8"
                          r="7"
                          stroke="#F5A623"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M8 5v3l2 2"
                          stroke="#F5A623"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span style={{ fontSize: 13, color: '#6B7280' }}>
                        Créneau pickup :{' '}
                        <strong style={{ color: '#1A1A1A' }}>
                          Lun 20 jan, 10h–12h
                        </strong>
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                      }}
                    >
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

      <AssociationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
