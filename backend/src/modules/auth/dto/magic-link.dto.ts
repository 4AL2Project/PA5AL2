import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class MagicLinkRequestDto {
  @ApiProperty({ example: 'titulaire@officine.fr', format: 'email' })
  @IsEmail()
  email!: string;
}

export class MagicLinkVerifyDto {
  @ApiProperty({ example: 'abc123...' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
