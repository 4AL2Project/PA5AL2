import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsString,
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
