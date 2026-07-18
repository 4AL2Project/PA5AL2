import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { config } from '../../core/config';
import { AssoJwtPayload } from './asso-auth.service';

@Injectable()
export class JwtAssoGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();

    let payload: AssoJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<AssoJwtPayload>(token, {
        secret: config.auth.accessSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (payload.type !== 'association') {
      throw new UnauthorizedException('Token non autorisé pour cet espace');
    }

    (request as Request & { assoUser?: AssoJwtPayload }).assoUser = payload;
    return true;
  }
}
