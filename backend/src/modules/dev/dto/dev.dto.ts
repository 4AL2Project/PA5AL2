import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class ResetDatabaseDto {
  @ApiProperty({
    description: 'Rejouer le seed de démo après avoir vidé la base',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  seed?: boolean;
}

export class ResetDatabaseResponseDto {
  @ApiProperty({ description: 'Tables vidées', type: [String] })
  truncated_tables!: string[];

  @ApiProperty({ description: 'Le seed a été rejoué' })
  seeded!: boolean;
}
