import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// Un créneau hebdo de récupération déclaré à la création/édition d'une asso.
export class PickupWindowDto {
  @ApiProperty({ example: 'MON' })
  @IsString()
  day!: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  start!: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  end!: string;
}

// Création d'une association depuis le back-office admin.
export class CreateAdminAssociationDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(300)
  address!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postal_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  agrement_numero?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  agrement_valide?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ type: [PickupWindowDto] })
  @IsOptional()
  @IsArray()
  @Type(() => PickupWindowDto)
  pickup_windows?: PickupWindowDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  send_invitation?: boolean;
}

// Mise à jour : mêmes champs, tous optionnels.
export class UpdateAdminAssociationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telephone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postal_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  agrement_numero?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  agrement_valide?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ type: [PickupWindowDto] })
  @IsOptional()
  @IsArray()
  @Type(() => PickupWindowDto)
  pickup_windows?: PickupWindowDto[];
}

// Changement de statut administratif.
export class PatchAssoStatutDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDUE', 'BLACKLISTEE'] })
  @IsString()
  @IsIn(['ACTIVE', 'SUSPENDUE', 'BLACKLISTEE'])
  statut!: 'ACTIVE' | 'SUSPENDUE' | 'BLACKLISTEE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  raison?: string;
}

// Ajout d'une note interne.
export class AddNoteDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  contenu!: string;
}
