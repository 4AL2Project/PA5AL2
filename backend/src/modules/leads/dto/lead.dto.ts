import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDemoRequestDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  first_name!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  last_name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  pharmacy_name!: string;

  @ApiProperty({ minimum: 1, maximum: 500, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  pharmacy_count?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

export class CreateWaitlistEntryDto {
  @ApiProperty()
  @IsEmail()
  email!: string;
}
