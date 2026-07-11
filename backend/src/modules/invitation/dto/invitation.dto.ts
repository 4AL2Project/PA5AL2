import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { PharmacyInputDto, TitulaireInputDto } from '../../admin/dto/admin.dto';

export class AcceptInvitationTitulaireDto {
  @ApiProperty({ example: 'Marie' })
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  @IsNotEmpty()
  last_name!: string;

  @ApiProperty({ example: '0612345678' })
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

export class AcceptInvitationDto {
  @ApiProperty({ type: PharmacyInputDto })
  @ValidateNested()
  @Type(() => PharmacyInputDto)
  pharmacy!: PharmacyInputDto;

  @ApiProperty({ type: AcceptInvitationTitulaireDto })
  @ValidateNested()
  @Type(() => AcceptInvitationTitulaireDto)
  titulaire!: AcceptInvitationTitulaireDto;

  @ApiProperty({ example: true })
  @IsBoolean()
  accepted_terms!: boolean;
}

export class InvitationInfoDto {
  @ApiProperty({ example: 'PREPARATEUR' })
  role!: string;

  @ApiProperty()
  pharmacy!: {
    pharmacy_id: string;
    name: string;
    address: string | null;
    siret: string | null;
  };

  @ApiProperty({ type: TitulaireInputDto })
  titulaire!: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone: string | null;
  };

  @ApiProperty({ type: String, format: 'date-time' })
  expires_at!: Date;
}

// Pas de mot de passe : le preparateur se connecte par code OTP a 6 chiffres.
export class AcceptPreparateurInvitationDto {
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

  @ApiProperty({ required: false, example: '0612345678' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  accepted_terms!: boolean;
}

export class AcceptAdminInvitationDto {
  @ApiProperty({ example: 'MonMotDePasse123', minLength: 8 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

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
