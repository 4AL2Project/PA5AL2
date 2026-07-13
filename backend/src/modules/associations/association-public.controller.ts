// Endpoints publics de la landing associations (pas d'auth : honeypot +
// rate limit par IP + vérification email)
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import {
  Body,
  Controller,
  HttpCode,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { diskStorage } from 'multer';

import { SlidingWindowRateLimiter } from '../../core/rate-limiter';
import {
  ASSOCIATION_LOGOS_DIR,
  associationLogoPublicUrl,
  ensureAssociationLogosDir,
} from '../../core/uploads';
import { AssociationRegistrationService } from './association-registration.service';
import { RegisterAssociationDto } from './dto/association.dto';

const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5 Mo
const ALLOWED_IMAGE_MIME = /^image\/(jpe?g|png|webp|gif|svg\+xml)$/;
// 5 inscriptions max par IP par heure
const REGISTRATION_MAX_PER_IP = 5;
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000;

const logoStorage = diskStorage({
  destination: (_req, _file, cb) => {
    ensureAssociationLogosDir();
    cb(null, ASSOCIATION_LOGOS_DIR);
  },
  filename: (_req, file, cb) => {
    cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
  },
});

@ApiTags('public-associations')
@Controller('api/public/associations')
export class AssociationPublicController {
  private readonly rateLimiter = new SlidingWindowRateLimiter(
    REGISTRATION_MAX_PER_IP,
    REGISTRATION_WINDOW_MS
  );

  constructor(private readonly registration: AssociationRegistrationService) {}

  @Post('register')
  @HttpCode(201)
  @ApiOperation({
    summary: "Auto-inscription d'une association depuis la landing publique",
  })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: logoStorage,
      limits: { fileSize: MAX_LOGO_BYTES },
      fileFilter: (_req, file, cb) => {
        cb(null, ALLOWED_IMAGE_MIME.test(file.mimetype));
      },
    })
  )
  register(
    @Req() req: Request,
    @Body() dto: RegisterAssociationDto,
    @UploadedFile() logo?: Express.Multer.File
  ) {
    if (!this.rateLimiter.allow(clientIp(req))) {
      throw new HttpException(
        'Trop de tentatives — réessayez plus tard',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    return this.registration.register(
      dto,
      logo ? associationLogoPublicUrl(logo.filename) : undefined
    );
  }

  @Post('verify/:token')
  @HttpCode(200)
  @ApiOperation({ summary: "Vérification de l'email d'inscription (lien 48h)" })
  verify(@Param('token') token: string) {
    return this.registration.verifyEmail(token);
  }
}

function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip ?? 'unknown';
}
