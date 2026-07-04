import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

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
}

// ─── Preparateurs (gestion par le titulaire) ─────────────────────────────────

export class CreatePreparateurDto {
  @ApiProperty({ example: 'Jean' })
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @ApiProperty({ example: 'Martin' })
  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @ApiProperty({ example: 'jean.martin@pharmacie.fr', format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '0612345678' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
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
