import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { decodeJwt } from '@/lib/auth';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/session';

const isProd = process.env.NODE_ENV === 'production';

export async function GET() {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (!access) {
    return NextResponse.json({ authenticated: false });
  }
  const claims = decodeJwt(access);
  if (!claims) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    role: claims.role,
    email: claims.email,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    access_token?: string;
    refresh_token?: string;
  } | null;

  if (!body?.access_token || !body?.refresh_token) {
    return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
  }

  const claims = decodeJwt(body.access_token);
  if (!claims) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const jar = await cookies();
  const accessMaxAge = Math.max(claims.exp - Math.floor(Date.now() / 1000), 0);

  jar.set(ACCESS_COOKIE, body.access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: accessMaxAge || 60 * 15,
  });
  jar.set(REFRESH_COOKIE, body.refresh_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true, role: claims.role });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
  return NextResponse.json({ ok: true });
}
