

"use client";

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

const AiPageComponent = lazy(() => 
  import('./components/page-component').then(module => ({ default: module.AiPageComponent }))
);

function AiPage() {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');
    
    return <AiPageComponent tab={tab || "compras"} />;
}

export default function AiPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <AiPage />
    </Suspense>
  );
}
