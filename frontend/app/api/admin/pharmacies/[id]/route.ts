import { NextRequest } from 'next/server';

import { proxyAdmin } from '@/lib/admin-proxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyAdmin(
    'PATCH',
    `/api/admin/pharmacies/${encodeURIComponent(id)}`,
    await req.text()
  );
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyAdmin(
    'DELETE',
    `/api/admin/pharmacies/${encodeURIComponent(id)}`
  );
}
