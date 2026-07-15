import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { MAX_ACTION_RADIUS_KM } from '../../donations/donation.types';

// Auto-inscription depuis la landing publique. `website` est un honeypot :
// tout contenu → soumission silencieusement ignorée (bot).
export class RegisterAssociationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ description: 'RNA (W…) ou SIREN' })
  @IsString()
  @MaxLength(20)
  rna_or_siren!: string;

  @ApiProperty()
  @IsEmail()
  contact_email!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(20)
  contact_phone!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  address!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(10)
  postal_code!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ minimum: 5, maximum: MAX_ACTION_RADIUS_KM })
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(MAX_ACTION_RADIUS_KM)
  action_radius_km!: number;

  @ApiProperty({ type: [String] })
  // multipart : une seule case cochée arrive en string, plusieurs en array
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @ArrayNotEmpty()
  categories!: string[];

  @ApiProperty({ required: false, minimum: 1, maximum: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  pickup_sla_days?: number;

  // Honeypot anti-bot : doit rester vide
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  website?: string;
}

export class ValidateAssociationDto {
  @ApiProperty({ description: 'Éligibilité au reçu fiscal vérifiée' })
  @IsBoolean()
  fiscal_receipt_verified!: boolean;
}

export class RejectAssociationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  reason!: string;
}
