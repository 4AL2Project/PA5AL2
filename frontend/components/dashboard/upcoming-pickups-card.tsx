import { CalendarClock } from 'lucide-react';
import Link from 'next/link';

import { DashboardData } from '@/lib/api';

// Retraits de dons planifiés cette semaine (dashboard don/RSE)
export function UpcomingPickupsCard({
  pickups,
}: {
  pickups: DashboardData['upcomingDonationPickups'];
}) {
  if (pickups.length === 0) return null;
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            Retraits de dons cette semaine
          </h2>
        </div>
        <Link
          href="/donations"
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Gérer les dons
        </Link>
      </div>
      <ul className="divide-y">
        {pickups.map((p) => (
          <li key={p.allocationId} className="px-4 py-2.5 text-sm">
            <span className="font-medium">{p.associationName}</span>
            <span className="text-muted-foreground">
              {' — '}
              {new Date(p.pickupSlotStart).toLocaleString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {' · '}
              {p.lines.map((l) => `${l.name} ×${l.quantity}`).join(', ')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
