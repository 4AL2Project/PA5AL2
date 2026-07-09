import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

import { UserRole } from '../roles.enum';

export class RegisterDto {
  @ApiProperty({ example: 'titulaire@officine-a.fr', format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'P4ssw0rd!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({
    example: '3c865b32-ba84-483d-8256-2b1d7d5e542e',
    format: 'uuid',
  })
  @IsUUID()
  pharmacy_id!: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.TITULAIRE })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class LoginDto {
  @ApiProperty({ example: 'titulaire@officine-a.fr', format: 'email' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'P4ssw0rd!' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  @IsString()
  @IsNotEmpty()
  refresh_token!: string;
}

export class AuthTokensDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  access_token!: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  refresh_token!: string;
}

export class RegisteredUserDto {
  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ format: 'uuid' })
  pharmacy_id!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at!: Date;
}

export class MePharmacyDto {
  @ApiProperty({ format: 'uuid' })
  pharmacy_id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  address?: string | null;

  @ApiPropertyOptional({ nullable: true })
  siret?: string | null;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  last_upload_at?: Date | null;

  @ApiPropertyOptional({
    description:
      'Réservé au titulaire (donnée commerciale, masquée au préparateur)',
  })
  subscription_tier?: string;
}

export class MeResponseDto {
  @ApiProperty({ format: 'uuid' })
  user_id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiPropertyOptional({ nullable: true })
  first_name?: string | null;

  @ApiPropertyOptional({ nullable: true })
  last_name?: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone?: string | null;

  @ApiProperty()
  status!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  accepted_terms_at?: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at!: Date;

  @ApiPropertyOptional({
    type: MePharmacyDto,
    nullable: true,
    description: 'null pour ADMIN_SAVELY (aucune officine rattachée)',
  })
  pharmacy?: MePharmacyDto | null;
}
