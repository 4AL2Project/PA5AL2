'use client';

import { useEffect, useState } from 'react';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
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
        borderBottom: '1px solid rgba(74,155,142,.12)',
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
          <svg width="34" height="34" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="48" height="48" rx="11" fill="#0F0F0F" />
            <path d="M8 13L16 35L24 13" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M28 13H42V35H34L28 29V13Z" fill="white" />
          </svg>
          <span
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#1A1A1A',
              letterSpacing: '-.5px',
            }}
          >
            Savely
          </span>
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
          <a href="#" className="nav-link">
            Se connecter
          </a>
          <a
            href="#demo"
            style={{
              background: '#4A9B8E',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
              padding: '10px 22px',
              borderRadius: 10,
              transition: 'background .2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#2D6B62')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#4A9B8E')}
          >
            Demander une démo
          </a>
        </div>

        {/* Mobile CTA */}
        <a
          href="#demo"
          className="mobile-cta"
          style={{
            display: 'none',
            background: '#4A9B8E',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            padding: '9px 18px',
            borderRadius: 9,
          }}
        >
          Démo
        </a>
      </div>
    </nav>
  );
}
