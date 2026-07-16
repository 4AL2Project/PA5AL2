import { NextRequest, NextResponse } from 'next/server';

import { devToolsEnabled } from '@/lib/dev-tools';
import { getSession } from '@/lib/session';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005';

export async function POST(req: NextRequest) {
  // Le back refuse déjà la route, mais autant ne pas la proxifier pour rien.
  if (!devToolsEnabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await req.text();
  const upstream = await fetch(`${API_BASE}/api/dev/reset`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: payload,
  });

  const body = await upstream.text();
  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
