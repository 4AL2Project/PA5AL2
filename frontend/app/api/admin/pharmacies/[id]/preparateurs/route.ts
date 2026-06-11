import { NextRequest } from 'next/server';

import { proxyAdmin } from '@/lib/admin-proxy';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyAdmin(
    'POST',
    `/api/admin/pharmacies/${encodeURIComponent(id)}/preparateurs`,
    await req.text()
  );
}
