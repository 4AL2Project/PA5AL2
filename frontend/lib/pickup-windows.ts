// Affichage des créneaux hebdo (V1 statiques) déclarés par une association

const DAY_LABEL: Record<string, string> = {
  MON: 'Lun',
  TUE: 'Mar',
  WED: 'Mer',
  THU: 'Jeu',
  FRI: 'Ven',
  SAT: 'Sam',
  SUN: 'Dim',
};

export function formatWindows(
  windows: { day: string; start: string; end: string }[] | null
): string {
  const safe = normalizeWindows(windows);
  if (safe.length === 0) return 'Non renseignés';
  return safe
    .map((w) => `${DAY_LABEL[w.day] ?? w.day} ${w.start}–${w.end}`)
    .join(' · ');
}

export const DAY_OPTIONS = Object.entries(DAY_LABEL).map(([value, label]) => ({
  value,
  label,
}));

/**
 * Ramène des créneaux à un tableau exploitable. Des données héritées peuvent
 * exposer un format inattendu (objet indexé par jour) ; on ne conserve alors
 * que les entrées bien formées plutôt que de laisser planter un `.map`.
 */
export function normalizeWindows(
  windows: unknown
): { day: string; start: string; end: string }[] {
  if (!Array.isArray(windows)) return [];
  return windows.filter(
    (w): w is { day: string; start: string; end: string } =>
      w != null &&
      typeof w === 'object' &&
      typeof (w as { day?: unknown }).day === 'string' &&
      typeof (w as { start?: unknown }).start === 'string' &&
      typeof (w as { end?: unknown }).end === 'string'
  );
}
