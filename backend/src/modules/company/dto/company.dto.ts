import { ApiProperty } from '@nestjs/swagger';

/**
 * Suggestion d'officine normalisée à partir de l'API
 * recherche-entreprises.api.gouv.fr — prête à pré-remplir le formulaire
 * de création d'officine côté admin.
 */
export class CompanySuggestionDto {
  @ApiProperty({ example: '12345678901234', description: 'SIRET du siège' })
  siret!: string;

  @ApiProperty({ example: 'Pharmacie du Centre' })
  name!: string;

  @ApiProperty({ example: '12 AVENUE DE LA LIBERATION 76100 ROUEN' })
  address!: string;

  @ApiProperty({ example: '76100' })
  postal_code!: string;

  @ApiProperty({ example: 'ROUEN' })
  city!: string;

  @ApiProperty({ example: 49.4431, nullable: true })
  latitude!: number | null;

  @ApiProperty({ example: 1.0993, nullable: true })
  longitude!: number | null;

  @ApiProperty({
    example: 'MARYAM',
    nullable: true,
    description:
      'Prénom du dirigeant (personne physique) — pré-remplit le titulaire',
  })
  director_first_name!: string | null;

  @ApiProperty({ example: 'PROVOST', nullable: true })
  director_last_name!: string | null;
}
