import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../../core/config';
import { UnauthorizedError } from '../../core/errors';

export interface AuthRequest extends Request {
  user?: {
    sub: string;
    email: string;
    pharmacy_id?: string;
  };
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError();
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.supabase.jwtSecret) as any;
      req.user = {
        sub: decoded.sub,
        email: decoded.email,
        pharmacy_id: decoded.pharmacy_id,
      };
      next();
    } catch {
      throw new UnauthorizedError();
    }
  }
}
