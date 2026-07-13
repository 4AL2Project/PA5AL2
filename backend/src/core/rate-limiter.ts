// Rate limiter en mémoire (fenêtre glissante) pour endpoints publics.
// Suffisant en mono-instance ; passer sur Redis si l'API est répliquée.
export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxHits: number,
    private readonly windowMs: number
  ) {}

  /** true si l'appel est autorisé (et le comptabilise), false si limité. */
  allow(key: string, now = Date.now()): boolean {
    const cutoff = now - this.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (recent.length >= this.maxHits) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    // Nettoyage opportuniste pour éviter la croissance sans borne
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) {
        if (v.every((t) => t <= cutoff)) this.hits.delete(k);
      }
    }
    return true;
  }
}
