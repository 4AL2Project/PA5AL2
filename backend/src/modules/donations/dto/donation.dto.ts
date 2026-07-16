import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class DonationLineDto {
  @IsUUID()
  product_id!: string;

  @IsInt()
  @Min(0)
  quantity!: number;
}

export class PickupSlotDto {
  @IsISO8601()
  start!: string;

  @IsISO8601()
  end!: string;
}

export class CreateDonationDto {
  @IsOptional()
  @IsUUID()
  action_id?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DonationLineDto)
  lines!: DonationLineDto[];

  @IsOptional()
  @IsUUID()
  preferred_association_id?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PickupSlotDto)
  pickup_windows?: PickupSlotDto[];
}

export class EligiblePreviewDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DonationLineDto)
  lines!: DonationLineDto[];
}

export class RespondProposalDto {
  @IsIn(['ACCEPT', 'REFUSE'])
  decision!: 'ACCEPT' | 'REFUSE';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DonationLineDto)
  lines?: DonationLineDto[];

  @IsOptional()
  @IsISO8601()
  slot_start?: string;

  @IsOptional()
  @IsISO8601()
  slot_end?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  refusal_reason?: string;
}

export class ConfirmPickupDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  picked_up_by?: string;
}

// Scan du QR de l'allocation par le préparateur (app Flutter)
export class ScanPickupDto {
  @IsString()
  @MaxLength(64)
  qr_code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  picked_up_by?: string;
}

export class UpdateDonParametresDto {
  @IsInt()
  @Min(63)
  @Max(117)
  seuil_dormance_jours!: number;

  @IsInt()
  @Min(10)
  @Max(100)
  rayon_matching_km!: number;
}
