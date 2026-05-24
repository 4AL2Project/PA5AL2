import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
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
