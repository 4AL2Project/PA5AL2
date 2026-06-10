import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/session';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get('q') ?? '';
  const upstream = await fetch(
    `${API_BASE}/api/admin/companies?q=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${session.access_token}` } }
  );

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
