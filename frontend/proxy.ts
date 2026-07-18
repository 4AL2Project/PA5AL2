import { NextRequest, NextResponse } from 'next/server';

import { decodeJwt, Role } from '@/lib/auth';

const ACCESS_COOKIE = 'savely_access';

const PUBLIC_PATHS = [
  '/login',
  '/admin/login',
  '/onboarding',
  '/admin/onboarding',
  '/preparateur/onboarding',
  '/auth/verify',
];

const ADMIN_PREFIX = '/admin';

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function landingForRole(role: Role): string {
  return role === 'ADMIN_SAVELY' ? '/admin' : '/';
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  const claims = token ? decodeJwt(token) : null;
  const isExpired = claims ? claims.exp * 1000 < Date.now() : true;
  const authenticated = !!claims && !isExpired;

  if (isPublic(pathname)) {
    if (
      authenticated &&
      (pathname === '/login' || pathname === '/admin/login')
    ) {
      return NextResponse.redirect(
        new URL(landingForRole(claims!.role), req.url)
      );
    }
    return NextResponse.next();
  }

  if (!authenticated) {
    const loginUrl = pathname.startsWith(ADMIN_PREFIX)
      ? '/admin/login'
      : '/login';
    return NextResponse.redirect(new URL(loginUrl, req.url));
  }

  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
  const isAdminUser = claims!.role === 'ADMIN_SAVELY';

  if (isAdminRoute && !isAdminUser) {
    return NextResponse.redirect(new URL('/', req.url));
  }
  if (!isAdminRoute && isAdminUser) {
    return NextResponse.redirect(new URL('/admin', req.url));
  }

  return NextResponse.next();
}

export const config = {
  // On exclut :
  //  - /api/*       → routes Next.js (session, proxy /api/be, /api/admin) qui gèrent leur propre auth
  //  - /_next/*     → assets bundle
  //  - /favicon.ico
  //  - tout fichier statique (contient un .)
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
