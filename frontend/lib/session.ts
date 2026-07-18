import 'server-only';

import { cookies } from 'next/headers';

import { decodeJwt, JwtClaims } from './auth';

export const ACCESS_COOKIE = 'savely_access';
export const REFRESH_COOKIE = 'savely_refresh';

export interface Session {
  access_token: string;
  refresh_token: string;
  claims: JwtClaims;
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (!access || !refresh) return null;

  const claims = decodeJwt(access);
  if (!claims) return null;
  return { access_token: access, refresh_token: refresh, claims };
}
