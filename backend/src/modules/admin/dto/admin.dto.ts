import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class PharmacyInputDto {
  @ApiProperty({ example: 'Pharmacie du Centre' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '12 rue de la Paix, 75001 Paris' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: '12345678901234' })
  @IsString()
  @IsNotEmpty()
  siret!: string;
}

export class TitulaireInputDto {
  @ApiProperty({ example: 'Marie' })
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @ApiProperty({ example: 'marie.dupont@pharmacie.fr', format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '0612345678' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class CreatePharmacyDto {
  @ApiProperty({ type: PharmacyInputDto })
  @ValidateNested()
  @Type(() => PharmacyInputDto)
  pharmacy!: PharmacyInputDto;

  @ApiProperty({ type: TitulaireInputDto })
  @ValidateNested()
  @Type(() => TitulaireInputDto)
  titulaire!: TitulaireInputDto;
}

export class CreatePharmacyResponseDto {
  @ApiProperty({ format: 'uuid' })
  pharmacy_id!: string;

  @ApiProperty()
  pharmacy_name!: string;

  @ApiProperty({ format: 'email' })
  titulaire_email!: string;

  @ApiProperty({ example: 'PENDING' })
  titulaire_status!: string;
}

export class PharmacyTitulaireDto {
  @ApiProperty({ nullable: true, example: 'Marie' })
  first_name!: string | null;

  @ApiProperty({ nullable: true, example: 'Dupont' })
  last_name!: string | null;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ nullable: true, example: '0612345678' })
  phone!: string | null;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;
}

export class PreparateurDto {
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

export class PharmacyDetailDto {
  @ApiProperty({ format: 'uuid' })
  pharmacy_id!: string;

  @ApiProperty({ example: 'Pharmacie du Centre' })
  name!: string;

  @ApiProperty({ nullable: true, example: '12 rue de la Paix, 75001 Paris' })
  address!: string | null;

  @ApiProperty({ nullable: true, example: '12345678901234' })
  siret!: string | null;

  @ApiProperty({ example: 'ACTIVE', enum: ['ACTIVE', 'INACTIVE'] })
  status!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at!: Date;

  @ApiProperty({ type: PharmacyTitulaireDto, nullable: true })
  titulaire!: PharmacyTitulaireDto | null;

  @ApiProperty({ type: [PreparateurDto] })
  preparateurs!: PreparateurDto[];
}

// ─── Mise a jour officine ────────────────────────────────────────────────────

export class UpdatePharmacyFieldsDto {
  @ApiProperty({ required: false, example: 'Pharmacie du Centre' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ required: false, example: '12 rue de la Paix, 75001 Paris' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  @ApiProperty({ required: false, example: '12345678901234' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  siret?: string;
}

export class UpdateTitulaireFieldsDto {
  @ApiProperty({ required: false, example: 'Marie' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  first_name?: string;

  @ApiProperty({ required: false, example: 'Dupont' })
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

export class UpdatePharmacyDto {
  @ApiProperty({ type: UpdatePharmacyFieldsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePharmacyFieldsDto)
  pharmacy?: UpdatePharmacyFieldsDto;

  @ApiProperty({ type: UpdateTitulaireFieldsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTitulaireFieldsDto)
  titulaire?: UpdateTitulaireFieldsDto;
}

export class UpdatePharmacyStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'], example: 'INACTIVE' })
  @IsIn(['ACTIVE', 'INACTIVE'])
  status!: 'ACTIVE' | 'INACTIVE';
}

// ─── Preparateurs ────────────────────────────────────────────────────────────

export class CreatePreparateurDto {
  @ApiProperty({ example: 'jean.martin@pharmacie.fr', format: 'email' })
  @IsEmail()
  email!: string;
}

export class UpdatePreparateurStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'], example: 'INACTIVE' })
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

// ─── Admin Users ──────────────────────────────────────────────────────────────

export class CreateAdminUserDto {
  @ApiProperty({ format: 'email', example: 'admin@savely.fr' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Alice' })
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @ApiProperty({ example: 'Martin' })
  @IsString()
  @IsNotEmpty()
  last_name!: string;
}

export class UpdateAdminUserDto {
  @ApiProperty({ required: false, example: 'Alice' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  first_name?: string;

  @ApiProperty({ required: false, example: 'Martin' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  last_name?: string;
}

export class UpdateAdminUserStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'], example: 'INACTIVE' })
  @IsIn(['ACTIVE', 'INACTIVE'])
  status!: 'ACTIVE' | 'INACTIVE';
}

export class AdminUserDto {
  @ApiProperty() user_id!: string;
  @ApiProperty({ nullable: true }) first_name!: string | null;
  @ApiProperty({ nullable: true }) last_name!: string | null;
  @ApiProperty() email!: string;
  @ApiProperty() status!: string;
  @ApiProperty() created_at!: Date;
}
