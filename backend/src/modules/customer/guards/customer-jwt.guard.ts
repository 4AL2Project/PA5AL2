import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { config } from '../../../core/config';
import { CustomerJwtPayload } from '../customer-jwt-payload';

@Injectable()
export class CustomerJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers['authorization'];
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();

    try {
      const payload = await this.jwtService.verifyAsync<CustomerJwtPayload>(
        token,
        { secret: config.auth.customerSecret }
      );
      if (payload.type !== 'customer') throw new Error('Wrong token type');
      (request as Request & { customer?: CustomerJwtPayload }).customer =
        payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired customer token');
    }
  }
}
