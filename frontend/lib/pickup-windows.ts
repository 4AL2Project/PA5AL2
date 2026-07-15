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
  if (!windows || windows.length === 0) return 'Non renseignés';
  return windows
    .map((w) => `${DAY_LABEL[w.day] ?? w.day} ${w.start}–${w.end}`)
    .join(' · ');
}

export const DAY_OPTIONS = Object.entries(DAY_LABEL).map(([value, label]) => ({
  value,
  label,
}));
