import { NextRequest } from 'next/server';

import { proxyAdmin } from '@/lib/admin-proxy';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyAdmin(
    'POST',
    `/api/admin/pharmacies/${encodeURIComponent(id)}/resend-invitation`
  );
}
