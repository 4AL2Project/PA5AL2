'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('savely_asso_token');
    router.replace(token ? '/offres' : '/auth/login');
  }, [router]);
  return null;
}
