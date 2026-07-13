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
  @IsString()
  @MaxLength(120)
  picked_up_by!: string;
}
