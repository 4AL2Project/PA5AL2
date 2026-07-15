import { NextRequest } from 'next/server';

import { proxyAdmin } from '@/lib/admin-proxy';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id, userId } = await params;
  return proxyAdmin(
    'PATCH',
    `/api/admin/pharmacies/${encodeURIComponent(id)}/preparateurs/${encodeURIComponent(userId)}/status`,
    await req.text()
  );
}
