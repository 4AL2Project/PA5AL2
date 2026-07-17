// Toutes les requêtes passent par le proxy same-origin `/api/be`
const BASE = '/api/be/api/admin/leads';

export interface DemoRequest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  pharmacy_name: string;
  pharmacy_count: number;
  message: string | null;
  contacted_at: string | null;
  created_at: string;
}

export interface DemoRequestList {
  data: DemoRequest[];
  total: number;
  page: number;
  limit: number;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
}

export interface WaitlistList {
  data: WaitlistEntry[];
  total: number;
  page: number;
  limit: number;
}

async function beGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  const payload = await res.json();
  if (payload && typeof payload === 'object' && 'success' in payload) {
    return (payload as { success: true; data: T }).data;
  }
  return payload as T;
}

async function bePatch<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: 'PATCH', cache: 'no-store' });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  const payload = await res.json();
  if (payload && typeof payload === 'object' && 'success' in payload) {
    return (payload as { success: true; data: T }).data;
  }
  return payload as T;
}

export async function fetchDemoRequest(id: string): Promise<DemoRequest> {
  return beGet(`${BASE}/demo/${id}`);
}

export async function fetchDemoRequests(page = 1): Promise<DemoRequestList> {
  return beGet(`${BASE}/demo?page=${page}&limit=50`);
}

export async function markDemoContacted(id: string): Promise<DemoRequest> {
  return bePatch(`${BASE}/demo/${id}/contacted`);
}

export async function fetchWaitlist(page = 1): Promise<WaitlistList> {
  return beGet(`${BASE}/waitlist?page=${page}&limit=100`);
}
