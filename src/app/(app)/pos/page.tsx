

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { PosPageComponent } from './components/page-component';

export default function POSPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <PosPageComponent />
        </Suspense>
    )
}
