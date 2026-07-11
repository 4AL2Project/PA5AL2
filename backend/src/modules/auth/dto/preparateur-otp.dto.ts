import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

/** Les claviers mobiles ajoutent volontiers une espace : on trim avant @IsEmail. */
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class PreparateurRequestCodeDto {
  @ApiProperty({ example: 'preparateur@pharmacie.fr' })
  @Transform(trim)
  @IsEmail()
  email!: string;
}

export class PreparateurVerifyCodeDto {
  @ApiProperty({ example: 'preparateur@pharmacie.fr' })
  @Transform(trim)
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '482915',
    description: 'Code à 6 chiffres reçu par email',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Le code doit contenir 6 chiffres' })
  code!: string;
}

export class PreparateurRequestCodeResponseDto {
  @ApiProperty({ example: 'Si ce compte existe, un code a été envoyé.' })
  message!: string;
}
