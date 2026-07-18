import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class PickupWindowDto {
  @ApiProperty({ enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] })
  @IsIn(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
  day!: string;

  @ApiProperty({ example: '14:00' })
  @Matches(HHMM)
  start!: string;

  @ApiProperty({ example: '17:00' })
  @Matches(HHMM)
  end!: string;
}

export class UpdatePharmacyMeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, description: 'Latitude WGS84' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiProperty({ required: false, description: 'Longitude WGS84' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiProperty({
    required: false,
    description: 'Créneaux hebdo de récupération des dons',
    type: [PickupWindowDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PickupWindowDto)
  donation_pickup_windows?: PickupWindowDto[];
}

// ─── Preparateurs (gestion par le titulaire) ─────────────────────────────────

export class CreatePreparateurDto {
  @ApiProperty({ example: 'jean.martin@pharmacie.fr', format: 'email' })
  @IsEmail()
  email!: string;
}

export class UpdatePreparateurStatusDto {
  @ApiProperty({ example: 'INACTIVE', enum: ['ACTIVE', 'INACTIVE'] })
  @IsIn(['ACTIVE', 'INACTIVE'])
  status!: 'ACTIVE' | 'INACTIVE';
}

export class UpdatePreparateurDto {
  @ApiProperty({ required: false, example: 'Jean' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  first_name?: string;

  @ApiProperty({ required: false, example: 'Martin' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  last_name?: string;

  @ApiProperty({ required: false, format: 'email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, example: '0612345678' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;
}

export class PreparateurResponseDto {
  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty({ nullable: true, example: 'Jean' })
  first_name!: string | null;

  @ApiProperty({ nullable: true, example: 'Martin' })
  last_name!: string | null;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ nullable: true, example: '0612345678' })
  phone!: string | null;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;
}
