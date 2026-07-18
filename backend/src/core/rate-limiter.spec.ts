// Cahier de tests : rate limiter fenêtre glissante (landing publique)

import { SlidingWindowRateLimiter } from './rate-limiter';

describe('SlidingWindowRateLimiter', () => {
  it('autorise jusqu’à N appels puis bloque dans la fenêtre', () => {
    const limiter = new SlidingWindowRateLimiter(3, 60_000);
    const t0 = 1_000_000;

    expect(limiter.allow('ip-1', t0)).toBe(true);
    expect(limiter.allow('ip-1', t0 + 1)).toBe(true);
    expect(limiter.allow('ip-1', t0 + 2)).toBe(true);
    expect(limiter.allow('ip-1', t0 + 3)).toBe(false);
  });

  it('isole les clés (une IP ne bloque pas les autres)', () => {
    const limiter = new SlidingWindowRateLimiter(1, 60_000);
    const t0 = 1_000_000;

    expect(limiter.allow('ip-1', t0)).toBe(true);
    expect(limiter.allow('ip-1', t0 + 1)).toBe(false);
    expect(limiter.allow('ip-2', t0 + 1)).toBe(true);
  });

  it('ré-autorise une fois la fenêtre glissée', () => {
    const limiter = new SlidingWindowRateLimiter(2, 60_000);
    const t0 = 1_000_000;

    limiter.allow('ip-1', t0);
    limiter.allow('ip-1', t0 + 1);
    expect(limiter.allow('ip-1', t0 + 2)).toBe(false);
    expect(limiter.allow('ip-1', t0 + 61_000)).toBe(true);
  });
});
