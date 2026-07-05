import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

// Mise à jour partielle du profil Customer — US-86
// Tous les champs sont optionnels (PATCH). Pas d'adresse (RGPD) : la position
// du client provient de la géolocalisation du device côté mobile.
export class UpdateCustomerMeDto {
  @ApiProperty({ required: false, enum: ['MR', 'MME'], example: 'MME' })
  @IsOptional()
  @IsIn(['MR', 'MME'])
  civility?: 'MR' | 'MME';

  @ApiProperty({ required: false, example: 'Jean' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiProperty({ required: false, example: 'Martin' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiProperty({ required: false, example: '+33612345678' })
  @IsOptional()
  @IsString()
  phone?: string;
}
