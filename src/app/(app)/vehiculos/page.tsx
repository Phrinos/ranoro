

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { VehiculosPageComponent } from './components/page-component';

export default function VehiculosPageWrapper() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <VehiculosPageComponent />
        </Suspense>
    );
}
