
"use client";

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const InformesPageComponent = lazy(() => 
  import('./components/page-component').then(module => ({ default: module.InformesPageComponent }))
);

export default function InformesPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <InformesPageComponent />
        </Suspense>
    )
}
