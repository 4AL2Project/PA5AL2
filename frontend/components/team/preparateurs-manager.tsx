'use client';

import { PreparateursTable } from '@/components/team/preparateurs-table';
import { Preparateur } from '@/lib/auth';

/** Gestion des préparateurs par le titulaire (mon officine, dérivée du token). */
export function PreparateursManager({
  preparateurs,
}: {
  preparateurs: Preparateur[];
}) {
  return (
    <PreparateursTable
      endpointBase="/api/be/api/pharmacies/me/preparateurs"
      preparateurs={preparateurs}
      emptyDescription="Ajoutez un préparateur de commande à votre officine. Il se connectera via un lien magique envoyé à son email."
    />
  );
}
