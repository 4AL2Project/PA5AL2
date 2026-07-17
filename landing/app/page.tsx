'use client';

import { useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Associations } from '@/components/associations';
import { Particuliers } from '@/components/particuliers';
import { FadeUp } from '@/components/fade-up';
import { DemoModal } from '@/components/demo-modal';

// ── SVG helpers ──────────────────────────────────────────────────────────────

function CheckCircleTeal() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="#F0F7F6" />
      <path
        d="M5.5 9l2.5 2.5 4.5-4.5"
        stroke="#4A9B8E"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckCircleWhite() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="9" fill="rgba(255,255,255,.2)" />
      <path
        d="M5.5 9l2.5 2.5 4.5-4.5"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckCircleWhiteLg() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="rgba(255,255,255,.2)" />
      <path
        d="M6 10l3 3 5-5"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrustCheckmark() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="7.5" fill="#4A9B8E" opacity=".15" />
      <path
        d="M4.5 7.5L6.5 9.5L10.5 5.5"
        stroke="#4A9B8E"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14M14 7l5 5-5 5"
        stroke="#C5E0DC"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ onDemoClick }: { onDemoClick?: () => void }) {
  return (
    <section style={{ padding: '96px 0 80px' }}>
      <div className="lp-container">
        <div
          className="hero-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 80,
            alignItems: 'center',
          }}
        >
          {/* Left */}
          <div>
            <FadeUp>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: '#F0F7F6',
                  border: '1px solid #C5E0DC',
                  borderRadius: 100,
                  padding: '6px 14px',
                  marginBottom: 28,
                }}
              >
                <span
                  className="animate-blink"
                  style={{
                    width: 7,
                    height: 7,
                    background: '#4A9B8E',
                    borderRadius: '50%',
                  }}
                />
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: '#4A9B8E' }}
                >
                  Pour les officines et groupements
                </span>
              </div>
            </FadeUp>

            <FadeUp delay={0.08}>
              <h1
                style={{
                  fontSize: 'clamp(36px,4.5vw,58px)',
                  fontWeight: 800,
                  lineHeight: 1.12,
                  letterSpacing: '-.03em',
                  color: '#1A1A1A',
                  marginBottom: 24,
                }}
              >
                Vos produits cosmétiques dorment.
                <br />
                <span style={{ color: '#4A9B8E' }}>Savely les réveille.</span>
              </h1>
            </FadeUp>

            <FadeUp delay={0.16}>
              <p
                style={{
                  fontSize: 18,
                  lineHeight: 1.65,
                  color: '#6B7280',
                  maxWidth: 480,
                  marginBottom: 40,
                }}
              >
                La plateforme qui transforme votre stock dormant en économies
                réelles — dons tracés, reçus fiscaux automatiques, zéro
                friction.
              </p>
            </FadeUp>

            <FadeUp delay={0.24}>
              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  flexWrap: 'wrap',
                  marginBottom: 32,
                }}
              >
                <button
                  onClick={onDemoClick}
                  style={{
                    background: '#4A9B8E',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700,
                    padding: '15px 28px',
                    borderRadius: 12,
                    display: 'inline-block',
                    transition: 'background .2s',
                    boxShadow: '0 4px 16px rgba(74,155,142,.35)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#2D6B62')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = '#4A9B8E')
                  }
                >
                  Demander une démo →
                </button>
                <a
                  href="#particuliers"
                  style={{
                    background: 'transparent',
                    color: '#4A9B8E',
                    fontSize: 15,
                    fontWeight: 600,
                    padding: '15px 24px',
                    borderRadius: 12,
                    display: 'inline-block',
                    border: '1.5px solid #4A9B8E',
                    transition: 'background .2s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#F0F7F6')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  Vous êtes un particulier&nbsp;?
                </a>
              </div>
            </FadeUp>

            <FadeUp delay={0.32}>
              <div
                className="trust-badges"
                style={{
                  display: 'flex',
                  gap: 20,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                {[
                  'Données hébergées en France',
                  'RGPD',
                  'Cerfa 16216 automatique',
                ].map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#6B7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <TrustCheckmark />
                    {t}
                  </span>
                ))}
              </div>
            </FadeUp>
          </div>

          {/* Right: dashboard mockup */}
          <FadeUp delay={0.1}>
            <div className="animate-float">
              <div
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  boxShadow:
                    '0 24px 64px rgba(0,0,0,.12),0 4px 16px rgba(74,155,142,.15)',
                  overflow: 'hidden',
                  border: '1px solid rgba(74,155,142,.1)',
                }}
              >
                {/* Window bar */}
                <div
                  style={{
                    background: '#F8FFFE',
                    borderBottom: '1px solid #EAF4F3',
                    padding: '14px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
                      <div
                        key={c}
                        style={{
                          width: 11,
                          height: 11,
                          borderRadius: '50%',
                          background: c,
                        }}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#6B7280',
                    }}
                  >
                    Savely · Vue d'ensemble
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: 24, background: '#fff' }}>
                  {/* Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          color: '#6B7280',
                          fontWeight: 500,
                        }}
                      >
                        Pharmacie du Centre — Janvier 2026
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: '#1A1A1A',
                          marginTop: 2,
                        }}
                      >
                        Tableau de bord
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#4A9B8E',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '6px 12px',
                        borderRadius: 8,
                      }}
                    >
                      ● En direct
                    </div>
                  </div>

                  {/* KPI cards */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3,1fr)',
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    {[
                      {
                        gradient: 'linear-gradient(135deg,#4A9B8E,#3a8a7d)',
                        label: 'Économisé',
                        value: '284€',
                        sub: 'ce mois',
                      },
                      {
                        gradient: 'linear-gradient(135deg,#3a8a7d,#2D6B62)',
                        label: 'Dons',
                        value: '3',
                        sub: 'complétés',
                      },
                      {
                        gradient: 'linear-gradient(135deg,#F5A623,#e8941a)',
                        label: 'Réduction',
                        value: '60%',
                        sub: 'fiscale',
                      },
                    ].map(({ gradient, label, value, sub }) => (
                      <div
                        key={label}
                        style={{
                          background: gradient,
                          borderRadius: 12,
                          padding: 16,
                          color: '#fff',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            opacity: 0.8,
                            textTransform: 'uppercase',
                            letterSpacing: '.05em',
                            marginBottom: 6,
                          }}
                        >
                          {label}
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>
                          {value}
                        </div>
                        <div
                          style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}
                        >
                          {sub}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bar chart */}
                  <div
                    style={{
                      background: '#F8FFFE',
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#6B7280',
                        marginBottom: 12,
                      }}
                    >
                      Activité — 6 derniers mois
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 8,
                        alignItems: 'flex-end',
                        height: 60,
                      }}
                    >
                      {[
                        { h: '35%', c: '#C5E0DC' },
                        { h: '55%', c: '#4A9B8E' },
                        { h: '40%', c: '#C5E0DC' },
                        { h: '70%', c: '#4A9B8E' },
                        { h: '85%', c: '#4A9B8E' },
                        { h: '100%', c: '#F5A623' },
                      ].map(({ h, c }, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            background: c,
                            borderRadius: '4px 4px 0 0',
                            height: h,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Cerfa badge */}
                  <div
                    style={{
                      marginTop: 16,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: '#F0F7F6',
                      borderRadius: 10,
                      padding: '12px 14px',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect width="18" height="18" rx="5" fill="#4A9B8E" />
                      <path
                        d="M5 9l3 3 5-5"
                        stroke="#fff"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: '#1A1A1A',
                        }}
                      >
                        Cerfa 16216 prêt
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>
                        Don · Croix-Rouge Paris 11e · 20 jan
                      </div>
                    </div>
                    <div
                      style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#4A9B8E',
                        cursor: 'pointer',
                      }}
                    >
                      Télécharger
                    </div>
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

// ── Stats ────────────────────────────────────────────────────────────────────

function Stats() {
  return (
    <section style={{ background: '#F0F7F6', padding: '96px 0' }}>
      <div className="lp-container">
        <FadeUp style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2
            style={{
              fontSize: 'clamp(28px,3.5vw,42px)',
              fontWeight: 800,
              letterSpacing: '-.03em',
              color: '#1A1A1A',
              marginBottom: 16,
            }}
          >
            Ce que coûte vraiment un stock mal géré
          </h2>
          <p
            style={{
              fontSize: 17,
              color: '#6B7280',
              maxWidth: 520,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Chaque mois sans action, c'est de l'argent qui dort — et des
            avantages fiscaux que vous laissez passer.
          </p>
        </FadeUp>

        <div
          className="stats-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 24,
          }}
        >
          {[
            {
              value: '650€–3 750€',
              color: '#4A9B8E',
              title: 'perdus par mois',
              desc: 'par officine sur les produits dormants non valorisés',
              delay: 0,
            },
            {
              value: '47 jours',
              color: '#4A9B8E',
              title: "d'immobilisation moyenne",
              desc: "avant qu'une action soit prise sur un cosmétique à rotation lente",
              delay: 0.1,
            },
            {
              value: '60%',
              color: '#F5A623',
              title: 'de réduction fiscale',
              desc: 'récupérable sur chaque don (art. 238 bis CGI) — tracé automatiquement',
              delay: 0.2,
            },
          ].map(({ value, color, title, desc, delay }) => (
            <FadeUp key={title} delay={delay}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  padding: '40px 32px',
                  border: '1px solid #EAF4F3',
                  boxShadow: '0 4px 24px rgba(74,155,142,.08)',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 800,
                    color,
                    letterSpacing: '-.03em',
                    lineHeight: 1,
                    marginBottom: 12,
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#1A1A1A',
                    marginBottom: 8,
                  }}
                >
                  {title}
                </div>
                <div
                  style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.55 }}
                >
                  {desc}
                </div>
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp style={{ textAlign: 'center', marginTop: 48 }}>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#2D6B62' }}>
            Savely transforme ces pertes en avantages fiscaux traçables.
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

// ── How it works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect
            x="8"
            y="4"
            width="16"
            height="20"
            rx="3"
            stroke="#4A9B8E"
            strokeWidth="2"
          />
          <path
            d="M12 10h8M12 14h8M12 18h5"
            stroke="#4A9B8E"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M16 24v4M12 26l4 2 4-2"
            stroke="#4A9B8E"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      num: '1',
      title: 'Importez votre stock',
      desc: 'Exportez depuis votre LGO (Winpharma, LGPI, Smart RX) et importez en moins de 5 minutes.',
      delay: 0,
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="10" stroke="#4A9B8E" strokeWidth="2" />
          <path
            d="M16 11v5l3 3"
            stroke="#4A9B8E"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M10 7l2 2M22 7l-2 2"
            stroke="#4A9B8E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      num: '2',
      title: 'Savely identifie les produits dormants',
      desc: 'Notre moteur analyse la vélocité de vos ventes et vous propose les meilleures actions.',
      delay: 0.12,
    },
    {
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect
            x="6"
            y="8"
            width="20"
            height="16"
            rx="4"
            stroke="#4A9B8E"
            strokeWidth="2"
          />
          <path
            d="M11 16l3 3 7-6"
            stroke="#4A9B8E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 4v4"
            stroke="#4A9B8E"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),
      num: '3',
      title: 'Donnez, économisez, recevez votre Cerfa',
      desc: 'Matchez avec une association proche, confirmez le pickup, téléchargez votre reçu fiscal 16216 automatiquement.',
      delay: 0.24,
    },
  ];

  return (
    <section className="lp-section">
      <div className="lp-container">
        <FadeUp style={{ textAlign: 'center', marginBottom: 72 }}>
          <h2
            style={{
              fontSize: 'clamp(28px,3.5vw,42px)',
              fontWeight: 800,
              letterSpacing: '-.03em',
              color: '#1A1A1A',
              marginBottom: 16,
            }}
          >
            Simple comme un export CSV
          </h2>
          <p
            style={{
              fontSize: 17,
              color: '#6B7280',
              maxWidth: 480,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Trois étapes. Zéro formation. Vos équipes sont opérationnelles le
            jour même.
          </p>
        </FadeUp>

        <div
          className="steps-row"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 48px 1fr 48px 1fr',
            alignItems: 'start',
          }}
        >
          {steps.flatMap((step, i) => [
            <FadeUp
              key={step.num}
              delay={step.delay}
              style={{ textAlign: 'center' }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  background: '#F0F7F6',
                  borderRadius: 20,
                  margin: '0 auto 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #C5E0DC',
                }}
              >
                {step.icon}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  background: '#4A9B8E',
                  borderRadius: '50%',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 800,
                  marginBottom: 16,
                }}
              >
                {step.num}
              </div>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#1A1A1A',
                  marginBottom: 10,
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: 15,
                  color: '#6B7280',
                  lineHeight: 1.6,
                  maxWidth: 280,
                  margin: '0 auto',
                }}
              >
                {step.desc}
              </p>
            </FadeUp>,
            ...(i < 2
              ? [
                  <div
                    key={`arrow-${i}`}
                    className="step-arrow-cell"
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingTop: 36,
                    }}
                  >
                    <ArrowRight />
                  </div>,
                ]
              : []),
          ])}
        </div>
      </div>
    </section>
  );
}

// ── Features ─────────────────────────────────────────────────────────────────

function Features() {
  const items = [
    {
      iconBg: '#F0F7F6',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="2" fill="#4A9B8E" />
          <rect
            x="3"
            y="14"
            width="7"
            height="7"
            rx="2"
            fill="#4A9B8E"
            opacity=".4"
          />
          <rect
            x="14"
            y="3"
            width="7"
            height="7"
            rx="2"
            fill="#4A9B8E"
            opacity=".4"
          />
          <rect
            x="14"
            y="14"
            width="7"
            height="7"
            rx="2"
            fill="#4A9B8E"
            opacity=".7"
          />
        </svg>
      ),
      title: 'Dashboard en temps réel',
      desc: "KPIs, actions prioritaires, ROI de vos dons — tout en un coup d'œil.",
    },
    {
      iconBg: '#F0F7F6',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="9" cy="12" r="5" stroke="#4A9B8E" strokeWidth="2" />
          <circle
            cx="15"
            cy="12"
            r="5"
            stroke="#4A9B8E"
            strokeWidth="2"
            strokeDasharray="2 1"
          />
        </svg>
      ),
      title: "Réseau d'associations partenaires",
      desc: 'Matching automatique à moins de 50 km avec des associations agréées.',
    },
    {
      iconBg: '#FFF8EE',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect
            x="4"
            y="3"
            width="16"
            height="18"
            rx="3"
            stroke="#F5A623"
            strokeWidth="2"
          />
          <path
            d="M8 8h8M8 12h8M8 16h5"
            stroke="#F5A623"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),
      title: 'Cerfa 16216 automatique',
      desc: 'Reçu fiscal généré et signé dès que le pickup est confirmé. 60% de réduction fiscale tracée.',
    },
    {
      iconBg: '#F0F7F6',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect
            x="5"
            y="3"
            width="14"
            height="18"
            rx="3"
            stroke="#4A9B8E"
            strokeWidth="2"
          />
          <path
            d="M9 7h6M9 11h6M9 15h3"
            stroke="#4A9B8E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <rect
            x="9"
            y="13"
            width="6"
            height="5"
            rx="1"
            fill="#4A9B8E"
            opacity=".2"
          />
        </svg>
      ),
      title: 'App préparateur QR Code',
      desc: 'Vos équipes terrain confirment les pickups en scannant un QR code. Simple et rapide.',
    },
    {
      iconBg: '#F0F7F6',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3L4 7v5c0 4.4 3.4 8.5 8 9.5 4.6-1 8-5.1 8-9.5V7l-8-4z"
            stroke="#4A9B8E"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M9 12l2 2 4-4"
            stroke="#4A9B8E"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      title: '100% conforme RGPD',
      desc: 'Données hébergées en France. Aucune donnée patient collectée. Audit disponible.',
    },
    {
      iconBg: '#F0F7F6',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 17l4-8 4 5 3-3 4 6"
            stroke="#4A9B8E"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M3 21h18"
            stroke="#4A9B8E"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
      title: 'Suivi RSE intégré',
      desc: 'Rapport mensuel de vos dons pour vos déclarations et communication RSE.',
    },
  ];

  return (
    <section
      id="fonctionnalites"
      style={{ background: '#F0F7F6', padding: '96px 0' }}
    >
      <div className="lp-container">
        <FadeUp style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2
            style={{
              fontSize: 'clamp(28px,3.5vw,42px)',
              fontWeight: 800,
              letterSpacing: '-.03em',
              color: '#1A1A1A',
              marginBottom: 16,
            }}
          >
            Tout ce dont votre officine a besoin
          </h2>
          <p
            style={{
              fontSize: 17,
              color: '#6B7280',
              maxWidth: 460,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Un outil pensé par des professionnels de santé, pour des
            professionnels de santé.
          </p>
        </FadeUp>

        <div
          className="features-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 20,
          }}
        >
          {items.map(({ iconBg, icon, title, desc }, i) => (
            <FadeUp key={title} delay={i * 0.06}>
              <div className="feature-card">
                <div
                  style={{
                    width: 48,
                    height: 48,
                    background: iconBg,
                    borderRadius: 12,
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {icon}
                </div>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#1A1A1A',
                    marginBottom: 8,
                  }}
                >
                  {title}
                </h3>
                <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.6 }}>
                  {desc}
                </p>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Groupements ───────────────────────────────────────────────────────────────

function Groupements() {
  const officines = [
    {
      name: 'Pharmacie du Centre — Paris 11e',
      sub: '3 dons ce mois · 284€ économisés',
      badge: '+60%',
      badgeBg: '#4A9B8E',
    },
    {
      name: 'Pharmacie Belleville — Paris 20e',
      sub: '1 don ce mois · 96€ économisés',
      badge: '+60%',
      badgeBg: '#4A9B8E',
    },
    {
      name: 'Pharmacie Lafayette — Lyon 6e',
      sub: '5 dons ce mois · 612€ économisés',
      badge: 'Top',
      badgeBg: '#F5A623',
    },
  ];

  return (
    <section
      id="groupements"
      style={{ background: '#4A9B8E', padding: '96px 0' }}
    >
      <div className="lp-container">
        <div
          className="groupements-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 80,
            alignItems: 'center',
          }}
        >
          {/* Left */}
          <FadeUp>
            <div
              style={{
                display: 'inline-block',
                background: 'rgba(255,255,255,.15)',
                borderRadius: 100,
                padding: '6px 16px',
                marginBottom: 28,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                Pour les groupements
              </span>
            </div>
            <h2
              style={{
                fontSize: 'clamp(28px,3.5vw,44px)',
                fontWeight: 800,
                letterSpacing: '-.03em',
                color: '#fff',
                lineHeight: 1.2,
                marginBottom: 24,
              }}
            >
              Vous pilotez un groupement&nbsp;?
            </h2>
            <p
              style={{
                fontSize: 17,
                color: 'rgba(255,255,255,.85)',
                lineHeight: 1.65,
                marginBottom: 32,
              }}
            >
              Savely s'adapte aux réseaux de pharmacies. Pilotez l'activité de
              toutes vos officines membres depuis un tableau de bord centralisé,
              mesurez l'impact RSE de votre réseau et négociez des partenariats
              associatifs à l'échelle.
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                marginBottom: 36,
              }}
            >
              {[
                'Vue consolidée toutes officines',
                'Rapport RSE réseau téléchargeable',
                'Tarification groupement sur mesure',
                'Onboarding accompagné',
              ].map((item) => (
                <div
                  key={item}
                  style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <CheckCircleWhiteLg />
                  <span
                    style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
            <a
              href="mailto:contact@savelypharma.fr"
              style={{
                background: '#fff',
                color: '#4A9B8E',
                fontSize: 15,
                fontWeight: 700,
                padding: '15px 28px',
                borderRadius: 12,
                display: 'inline-block',
                transition: 'background .2s',
                boxShadow: '0 4px 20px rgba(0,0,0,.15)',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(255,255,255,.92)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
            >
              Contacter l'équipe Savely →
            </a>
          </FadeUp>

          {/* Right: multi-officine panel */}
          <FadeUp delay={0.12}>
            <div
              style={{
                background: 'rgba(255,255,255,.1)',
                borderRadius: 20,
                padding: 28,
                border: '1px solid rgba(255,255,255,.2)',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,.7)',
                  marginBottom: 16,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                }}
              >
                Réseau · 12 officines
              </div>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {officines.map(({ name, sub, badge, badgeBg }) => (
                  <div
                    key={name}
                    style={{
                      background: 'rgba(255,255,255,.12)',
                      borderRadius: 12,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: '1px solid rgba(255,255,255,.1)',
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}
                      >
                        {name}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'rgba(255,255,255,.65)',
                          marginTop: 2,
                        }}
                      >
                        {sub}
                      </div>
                    </div>
                    <div
                      style={{
                        background: badgeBg,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '5px 10px',
                        borderRadius: 8,
                        border:
                          badgeBg === '#4A9B8E'
                            ? '1px solid rgba(255,255,255,.3)'
                            : undefined,
                      }}
                    >
                      {badge}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 20,
                  background: 'rgba(255,255,255,.08)',
                  borderRadius: 12,
                  padding: 16,
                  border: '1px solid rgba(255,255,255,.1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,.8)',
                    }}
                  >
                    Impact RSE réseau
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>
                    Janvier 2026
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: '#fff',
                    marginBottom: 4,
                  }}
                >
                  4 820€
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)' }}>
                  économisés sur 12 officines · 31 dons · Cerfa générés
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

// ── Social proof ──────────────────────────────────────────────────────────────

function SocialProof() {
  const testimonials = [
    {
      quote: `“En 3 mois, nous avons économisé 1 200€ en avantages fiscaux sur des produits qu’on aurait jetés. Et le Cerfa arrive tout seul — c’est magique.”`,
      initials: 'SM',
      name: 'Dr. Sophie M.',
      role: 'Titulaire, Paris 11e',
      delay: 0,
    },
    {
      quote: `”Déployé sur 8 pharmacies de notre réseau en une semaine. L’onboarding est vraiment accompagné, et le tableau de bord consolidé est bluffant.”`,
      initials: 'PL',
      name: 'Pierre L.',
      role: 'Directeur, Groupement PharmAlliance Sud',
      delay: 0.1,
    },
    {
      quote: `"On avait peur que ça soit complexe avec le LGO. En réalité, 5 minutes d'import et c'est parti. Nos préparateurs adorent le QR code."`,
      initials: 'MC',
      name: 'Marie-Claire D.',
      role: 'Titulaire, Lyon 3e',
      delay: 0.2,
    },
  ];

  return (
    <section className="lp-section">
      <div className="lp-container">
        <FadeUp style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2
            style={{
              fontSize: 'clamp(26px,3vw,38px)',
              fontWeight: 800,
              letterSpacing: '-.03em',
              color: '#1A1A1A',
              marginBottom: 14,
            }}
          >
            Ils font confiance à Savely
          </h2>
          <p style={{ fontSize: 16, color: '#6B7280' }}>
            Des officines et groupements qui ont transformé leur gestion de
            stock.
          </p>
        </FadeUp>

        <div
          className="testimonials-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 24,
            marginBottom: 64,
          }}
        >
          {testimonials.map(({ quote, initials, name, role, delay }) => (
            <FadeUp key={name} delay={delay}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  padding: 32,
                  border: '1px solid #EAF4F3',
                  boxShadow: '0 4px 20px rgba(0,0,0,.06)',
                  height: '100%',
                }}
              >
                <div
                  style={{ color: '#F5A623', fontSize: 20, marginBottom: 16 }}
                >
                  ★★★★★
                </div>
                <p
                  style={{
                    fontSize: 15,
                    color: '#374151',
                    lineHeight: 1.7,
                    marginBottom: 20,
                    fontStyle: 'italic',
                  }}
                >
                  {quote}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      background: '#F0F7F6',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      color: '#4A9B8E',
                      fontSize: 14,
                    }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#1A1A1A',
                      }}
                    >
                      {name}
                    </div>
                    <div style={{ fontSize: 13, color: '#6B7280' }}>{role}</div>
                  </div>
                </div>
              </div>
            </FadeUp>
          ))}
        </div>

        {/* Partner logos */}
        <FadeUp style={{ textAlign: 'center', marginBottom: 24 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '.1em',
              marginBottom: 28,
            }}
          >
            Groupements partenaires
          </p>
        </FadeUp>
        <FadeUp>
          <div
            style={{
              display: 'flex',
              gap: 20,
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {[
              'PHARMALLIANCE',
              'RÉSEAU SANTÉ+',
              "GROUPEMENT OFFICIN'AL",
              'PHARMARÉSEAUX',
            ].map((logo) => (
              <div
                key={logo}
                style={{
                  background: '#F5F5F5',
                  borderRadius: 10,
                  padding: '12px 28px',
                  border: '1px solid #E5E7EB',
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#9CA3AF',
                    letterSpacing: '.05em',
                  }}
                >
                  {logo}
                </span>
              </div>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function Pricing({ onDemoClick }: { onDemoClick?: () => void }) {
  const essentialFeatures = [
    '1 officine',
    'Import CSV illimité',
    'Module don complet',
    'Cerfa 16216 automatique',
    'Support email',
  ];
  const groupFeatures = [
    'Officines illimitées',
    'Dashboard consolidé réseau',
    'Rapport RSE réseau',
    'Onboarding accompagné',
    'Support dédié prioritaire',
  ];

  return (
    <section id="tarifs" style={{ background: '#F0F7F6', padding: '96px 0' }}>
      <div className="lp-container">
        <FadeUp style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2
            style={{
              fontSize: 'clamp(28px,3.5vw,42px)',
              fontWeight: 800,
              letterSpacing: '-.03em',
              color: '#1A1A1A',
              marginBottom: 14,
            }}
          >
            Transparent, sans surprise
          </h2>
          <p style={{ fontSize: 17, color: '#6B7280' }}>
            Commencez gratuitement. Scalez quand vous êtes prêt.
          </p>
        </FadeUp>

        <div
          className="pricing-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2,1fr)',
            gap: 24,
            maxWidth: 820,
            margin: '0 auto',
          }}
        >
          {/* Essentiel */}
          <FadeUp>
            <div
              style={{
                background: '#fff',
                borderRadius: 24,
                padding: '40px 36px',
                border: '1px solid #EAF4F3',
                boxShadow: '0 4px 24px rgba(0,0,0,.06)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '.1em',
                  color: '#4A9B8E',
                  marginBottom: 20,
                }}
              >
                Essentiel
              </div>
              <div style={{ marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 42,
                    fontWeight: 800,
                    color: '#1A1A1A',
                    letterSpacing: '-.03em',
                  }}
                >
                  49€
                </span>
                <span style={{ fontSize: 16, color: '#6B7280', marginLeft: 4 }}>
                  /mois
                </span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: '#4A9B8E',
                  fontWeight: 600,
                  marginBottom: 28,
                }}
              >
                14 jours gratuits, sans carte bancaire
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  marginBottom: 36,
                  flex: 1,
                }}
              >
                {essentialFeatures.map((f) => (
                  <div
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 15,
                      color: '#374151',
                    }}
                  >
                    <CheckCircleTeal />
                    {f}
                  </div>
                ))}
              </div>
              <button
                onClick={onDemoClick}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  background: '#F0F7F6',
                  color: '#4A9B8E',
                  fontSize: 15,
                  fontWeight: 700,
                  padding: 14,
                  borderRadius: 12,
                  border: '1.5px solid #4A9B8E',
                  transition: 'background .2s, color .2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#4A9B8E';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F0F7F6';
                  e.currentTarget.style.color = '#4A9B8E';
                }}
              >
                Commencer gratuitement
              </button>
            </div>
          </FadeUp>

          {/* Groupement */}
          <FadeUp delay={0.1}>
            <div
              style={{
                background: '#4A9B8E',
                borderRadius: 24,
                padding: '40px 36px',
                boxShadow: '0 16px 48px rgba(74,155,142,.35)',
                position: 'relative',
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  background: '#F5A623',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '5px 12px',
                  borderRadius: 100,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                }}
              >
                Populaire
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '.1em',
                  color: 'rgba(255,255,255,.75)',
                  marginBottom: 20,
                }}
              >
                Groupement
              </div>
              <div style={{ marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 42,
                    fontWeight: 800,
                    color: '#fff',
                    letterSpacing: '-.03em',
                  }}
                >
                  Sur devis
                </span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: 'rgba(255,255,255,.75)',
                  fontWeight: 600,
                  marginBottom: 28,
                }}
              >
                Adapté à la taille de votre réseau
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  marginBottom: 36,
                  flex: 1,
                }}
              >
                {groupFeatures.map((f) => (
                  <div
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: 15,
                      color: 'rgba(255,255,255,.9)',
                    }}
                  >
                    <CheckCircleWhite />
                    {f}
                  </div>
                ))}
              </div>
              <a
                href="mailto:contact@savelypharma.fr"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#fff',
                  color: '#4A9B8E',
                  fontSize: 15,
                  fontWeight: 700,
                  padding: 14,
                  borderRadius: 12,
                  transition: 'background .2s',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(255,255,255,.9)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = '#fff')
                }
              >
                Contacter l'équipe →
              </a>
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

// ── CTA Final ─────────────────────────────────────────────────────────────────

function CtaFinal({ onDemoClick }: { onDemoClick?: () => void }) {
  return (
    <section id="demo" style={{ background: '#4A9B8E', padding: '96px 0' }}>
      <div className="lp-container">
        <FadeUp
          style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}
        >
          <h2
            style={{
              fontSize: 'clamp(30px,4vw,52px)',
              fontWeight: 800,
              letterSpacing: '-.03em',
              color: '#fff',
              lineHeight: 1.15,
              marginBottom: 20,
            }}
          >
            Prêt à transformer votre stock en impact&nbsp;?
          </h2>
          <p
            style={{
              fontSize: 18,
              color: 'rgba(255,255,255,.82)',
              marginBottom: 40,
              lineHeight: 1.6,
            }}
          >
            14 jours gratuits. Sans carte bancaire. Sans engagement.
          </p>
          <button
            onClick={onDemoClick}
            style={{
              display: 'inline-block',
              background: '#fff',
              color: '#4A9B8E',
              fontSize: 17,
              fontWeight: 800,
              padding: '18px 40px',
              borderRadius: 14,
              transition: 'background .2s, transform .15s',
              boxShadow: '0 8px 32px rgba(0,0,0,.2)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,.93)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.transform = 'none';
            }}
          >
            Demander une démo gratuite →
          </button>
          <p
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,.55)',
              marginTop: 20,
            }}
          >
            Réponse sous 24h · Cerfa 16216 · 60% de réduction fiscale
          </p>
        </FadeUp>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer
      style={{ background: '#1A1A1A', paddingTop: 64, paddingBottom: 40 }}
    >
      <div className="lp-container">
        <div
          className="footer-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: 48,
            marginBottom: 48,
          }}
        >
          {/* Col 1: Brand */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  width="48"
                  height="48"
                  rx="11"
                  fill="#fff"
                  fillOpacity=".1"
                />
                <path
                  d="M8 13L16 35L24 13"
                  stroke="white"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M28 13H42V35H34L28 29V13Z" fill="white" />
              </svg>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#fff',
                  letterSpacing: '-.5px',
                }}
              >
                Savely
              </span>
            </div>
            <p
              style={{
                fontSize: 14,
                color: '#6B7280',
                lineHeight: 1.65,
                marginBottom: 20,
                maxWidth: 220,
              }}
            >
              Valorisez votre stock dormant. Maximisez vos avantages fiscaux.
            </p>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                background: '#2A2A2A',
                borderRadius: 8,
                transition: 'background .2s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = '#4A9B8E')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = '#2A2A2A')
              }
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 5.5h2V13H3V5.5zM4 4.5a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zM7 5.5h1.9v1s.6-1 2.1-1c1.8 0 2.5 1.1 2.5 3V13H11.5V9c0-1-.3-1.8-1.3-1.8-.9 0-1.2.6-1.2 1.8V13H7V5.5z"
                  fill="#9CA3AF"
                />
              </svg>
            </a>
            <p style={{ fontSize: 13, color: '#4B5563', marginTop: 28 }}>
              © 2026 Savely · savelypharma.fr
            </p>
          </div>

          {/* Col 2: Produit */}
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                marginBottom: 18,
              }}
            >
              Produit
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Fonctionnalités', href: '#fonctionnalites' },
                { label: 'Tarifs', href: '#tarifs' },
                { label: 'Demander une démo', href: '#demo' },
                { label: 'Se connecter', href: '#' },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  style={{
                    fontSize: 14,
                    color: '#9CA3AF',
                    transition: 'color .2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = '#9CA3AF')
                  }
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Col 3: Pour qui */}
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                marginBottom: 18,
              }}
            >
              Pour qui
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Officines', href: '#' },
                { label: 'Groupements', href: '#groupements' },
                { label: 'Associations', href: '#associations' },
                { label: 'Particuliers', href: '#particuliers' },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  style={{
                    fontSize: 14,
                    color: '#9CA3AF',
                    transition: 'color .2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = '#9CA3AF')
                  }
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Col 4: Légal */}
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                marginBottom: 18,
              }}
            >
              Légal
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'CGU',
                'Politique de confidentialité',
                'RGPD',
                'Mentions légales',
              ].map((label) => (
                <a
                  key={label}
                  href="#"
                  style={{
                    fontSize: 14,
                    color: '#9CA3AF',
                    transition: 'color .2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = '#9CA3AF')
                  }
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid #2A2A2A', paddingTop: 28 }}>
          <p style={{ fontSize: 13, color: '#4B5563' }}>
            Savely SAS — Données hébergées en France — RGPD conforme
          </p>
          <p style={{ fontSize: 13, color: '#4B5563', marginTop: 4 }}>
            Réduction fiscale art. 238 bis CGI · Cerfa n°16216 · Associations
            agréées
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [demoOpen, setDemoOpen] = useState(false);
  const openDemo = () => setDemoOpen(true);

  return (
    <>
      <Navbar onDemoClick={openDemo} />
      <div style={{ height: 68 }} />
      <Hero onDemoClick={openDemo} />
      <Stats />
      <HowItWorks />
      <Features />
      <Groupements />
      <Associations />
      <Particuliers />
      <SocialProof />
      <Pricing onDemoClick={openDemo} />
      <CtaFinal onDemoClick={openDemo} />
      <Footer />
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
