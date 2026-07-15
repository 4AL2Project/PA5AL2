import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/session';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3005';

async function forward(req: NextRequest, pathSegments: string[]) {
  const session = await getSession();
  const targetPath = '/' + pathSegments.map(encodeURIComponent).join('/');
  const search = req.nextUrl.search;
  const url = `${API_BASE}${targetPath}${search}`;

  const headers = new Headers();
  const incomingContentType = req.headers.get('content-type');
  if (incomingContentType) headers.set('content-type', incomingContentType);
  if (session) {
    headers.set('authorization', `Bearer ${session.access_token}`);
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: 'no-store',
  };
  if (!['GET', 'HEAD'].includes(req.method)) {
    init.body = await req.arrayBuffer();
  }

  try {
    const upstream = await fetch(url, init);
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'content-type':
          upstream.headers.get('content-type') ?? 'application/octet-stream',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'API indisponible' } },
      { status: 503 }
    );
  }
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return forward(req, path);
}
