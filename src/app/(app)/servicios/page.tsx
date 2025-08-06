

"use client";

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const ServiciosPageComponent = lazy(() => 
  import('./components/page-component').then(module => ({ default: module.ServiciosPageComponent }))
);

function ServiciosPage() {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');
    
    return <ServiciosPageComponent tab={tab || "activos"} />;
}

export default function ServiciosPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <ServiciosPage />
    </Suspense>
  );
}
