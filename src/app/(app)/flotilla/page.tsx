

"use client";

import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const FlotillaPageComponent = lazy(() => 
  import('./components/page-component').then(module => ({ default: module.FlotillaPageComponent }))
);

export default function FlotillaPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <FlotillaPageComponent />
        </Suspense>
    )
}
