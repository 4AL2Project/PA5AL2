'use client';

import { MailCheck, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { PharmacyListItem } from '@/lib/auth';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function titulaireName(item: PharmacyListItem): string {
  if (!item.titulaire) return '—';
  const { first_name, last_name } = item.titulaire;
  const full = [first_name, last_name].filter(Boolean).join(' ').trim();
  return full || item.titulaire.email;
}

export function PharmacyRow({ item }: { item: PharmacyListItem }) {
  const router = useRouter();
  const href = `/admin/officine/${item.pharmacy_id}`;

  return (
    <TableRow
      role="link"
      tabIndex={0}
      aria-label={`Voir les détails de ${item.name}`}
      className="cursor-pointer"
      onClick={() => router.push(href)}
      onMouseEnter={() => router.prefetch(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(href);
        }
      }}
    >
      <TableCell className="text-xs font-medium">
        <div className="flex flex-col">
          <span>{item.name}</span>
          {item.address && (
            <span className="text-[10px] text-muted-foreground">
              {item.address}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground font-mono">
        {item.siret ?? '—'}
      </TableCell>
      <TableCell className="text-xs">{titulaireName(item)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {item.titulaire?.email ?? '—'}
      </TableCell>
      <TableCell>
        {item.titulaire?.status === 'ACTIVE' ? (
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <MailCheck className="h-3 w-3" />
            Actif
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Send className="h-3 w-3" />
            Invité
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground text-right">
        {formatDate(item.created_at)}
      </TableCell>
    </TableRow>
  );
}
