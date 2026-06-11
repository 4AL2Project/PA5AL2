import 'server-only';

import { NextResponse } from 'next/server';

import { getSession } from '@/lib/session';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005';

/**
 * Proxy une mutation admin vers le backend : vérifie la session ADMIN_SAVELY,
 * relaie la méthode + le corps avec le token, et renvoie la réponse upstream.
 * Garde le token d'accès côté serveur (jamais exposé au client).
 */
export async function proxyAdmin(
  method: 'PATCH' | 'POST' | 'DELETE',
  backendPath: string,
  body?: string
): Promise<NextResponse> {
  const session = await getSession();
  if (!session || session.claims.role !== 'ADMIN_SAVELY') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const upstream = await fetch(`${API_BASE}${backendPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: body && body.length > 0 ? body : undefined,
  });

  const payload = await upstream.text();
  return new NextResponse(payload, {
    status: upstream.status,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/json',
    },
  });
}
