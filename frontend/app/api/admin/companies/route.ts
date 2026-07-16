import { NextRequest, NextResponse } from 'next/server';

import { SERVER_API_BASE as API_BASE } from '@/lib/api-base';
import { getSession } from '@/lib/session';

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
