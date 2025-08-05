

"use client";

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const CajaPageComponent = lazy(() => 
  import('./components/page-component').then(module => ({ default: module.CajaPageComponent }))
);

function CajaPage() {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');
    
    return <CajaPageComponent tab={tab || "caja"} />;
}

export default function CajaPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <CajaPage />
    </Suspense>
  );
}
