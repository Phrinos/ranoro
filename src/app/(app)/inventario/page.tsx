

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { InventarioPageComponent } from './components/page-component';

export default function InventarioPageWrapper() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <InventarioPageComponent />
        </Suspense>
    )
}
