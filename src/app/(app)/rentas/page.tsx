

"use client";

import { Suspense, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RentasPageComponent } from './components/page-component';

function RentasPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tab = searchParams.get('tab');
    const action = searchParams.get('action');

    useEffect(() => {
      if (action === 'registrar') {
        // You might want to handle this logic inside the RentasPageComponent
        // or trigger a state update that opens the dialog.
        // For now, we can clear the query param to avoid loops.
        // A more robust solution might use state management.
        router.replace('/rentas?tab=' + (tab || 'resumen'), { scroll: false });
      }
    }, [action, tab, router]);

    return <RentasPageComponent tab={tab || undefined} />;
}

export default function RentasPageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <RentasPage />
        </Suspense>
    )
}
