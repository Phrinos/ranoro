

"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AgendaRedirector() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/servicios?tab=agenda');
  }, [router]);

  return null;
}
