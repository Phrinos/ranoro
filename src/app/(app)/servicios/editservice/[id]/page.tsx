// This file is deprecated and will be removed.
// All logic has been moved to /src/app/(app)/servicios/[id]/page.tsx
// to maintain a single route for editing.
"use client";

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function DeprecatedEditServicePage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;
  
  useEffect(() => {
    if (serviceId) {
      // Redirect to the correct, unified edit page.
      router.replace(`/servicios/${serviceId}`);
    } else {
      // If there's no ID, redirect to the services list.
      router.replace('/servicios');
    }
  }, [serviceId, router]);

  return null; // Render nothing while redirecting.
}
