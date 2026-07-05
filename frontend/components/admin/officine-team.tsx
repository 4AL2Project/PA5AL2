'use client';

import { PreparateursTable } from '@/components/team/preparateurs-table';
import { Preparateur } from '@/lib/auth';

/** Gestion des préparateurs d'une officine ciblée depuis l'espace admin. */
export function OfficineTeam({
  pharmacyId,
  preparateurs,
}: {
  pharmacyId: string;
  preparateurs: Preparateur[];
}) {
  return (
    <PreparateursTable
      endpointBase={`/api/admin/pharmacies/${pharmacyId}/preparateurs`}
      preparateurs={preparateurs}
      emptyDescription="Ajoutez un préparateur de commande pour cette officine. Il recevra une invitation par email pour créer son compte."
    />
  );
}
