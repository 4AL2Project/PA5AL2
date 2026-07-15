import { UserRole } from './roles.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  pharmacy_id: string | null;
  role: UserRole;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}
