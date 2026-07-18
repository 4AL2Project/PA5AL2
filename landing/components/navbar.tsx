'use client';

import { useEffect, useRef, useState } from 'react';
import { SavelyLogo } from './savely-logo';

const titulaireUrl =
  process.env.NEXT_PUBLIC_TITULAIRE_URL ?? 'http://localhost:3000';
const assoUrl = process.env.NEXT_PUBLIC_ASSO_URL ?? 'http://localhost:3001';

interface NavbarProps {
  onDemoClick?: () => void;
}

export function Navbar({ onDemoClick }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) {
        setLoginOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(255,255,255,.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0, 150, 137,.12)',
        transition: 'box-shadow .3s',
        boxShadow: scrolled ? '0 2px 24px rgba(0,0,0,0.1)' : 'none',
      }}
    >
      <div
        className="lp-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 68,
        }}
      >
        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SavelyLogo className="h-7 w-auto" />
        </a>

        {/* Desktop nav */}
        <div
          className="nav-links-desktop"
          style={{ display: 'flex', gap: 32, alignItems: 'center' }}
        >
          <a href="#fonctionnalites" className="nav-link">
            Fonctionnalités
          </a>
          <a href="#associations" className="nav-link">
            Pour les associations
          </a>
          <a href="#tarifs" className="nav-link">
            Tarifs
          </a>

          {/* Login dropdown */}
          <div ref={loginRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setLoginOpen((o) => !o)}
              className="nav-link"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: 0,
              }}
            >
              Se connecter
              <span style={{ fontSize: 10, lineHeight: 1 }}>▾</span>
            </button>

            {loginOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 200,
                  background: '#fff',
                  boxShadow: '0 8px 32px rgba(0,0,0,.12)',
                  borderRadius: 12,
                  minWidth: 220,
                  border: '1px solid rgba(0, 150, 137,.15)',
                  marginTop: 8,
                  overflow: 'hidden',
                }}
              >
                <a
                  href={titulaireUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setLoginOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    fontSize: 14,
                    color: '#1A1A1A',
                    textDecoration: 'none',
                    cursor: 'pointer',
                    borderBottom: '1px solid #F3F4F6',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#e8f9f6')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <span>🏥</span>
                  <span>Espace Officine</span>
                </a>
                <a
                  href={assoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setLoginOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    fontSize: 14,
                    color: '#1A1A1A',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#e8f9f6')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <span>🤝</span>
                  <span>Espace Association</span>
                </a>
              </div>
            )}
          </div>

          <button
            onClick={onDemoClick}
            style={{
              background: '#009689',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              padding: '10px 22px',
              borderRadius: 10,
              transition: 'background .2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#00786c')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#009689')}
          >
            Demander une démo
          </button>
        </div>

        {/* Mobile CTA */}
        <button
          onClick={onDemoClick}
          className="mobile-cta"
          style={{
            display: 'none',
            background: '#009689',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            padding: '9px 18px',
            borderRadius: 10,
            cursor: 'pointer',
          }}
        >
          Démo
        </button>
      </div>
    </nav>
  );
}
