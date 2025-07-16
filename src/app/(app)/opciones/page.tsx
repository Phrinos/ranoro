

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { OpcionesPageComponent } from './components/page-component';

export default function OpcionesPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <OpcionesPageComponent />
        </Suspense>
    );
}
