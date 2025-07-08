
"use client";

import { redirect, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function Redirector() {
    const searchParams = useSearchParams();
    // We redirect to the main inventory page, which now contains this content in a tab.
    // The tab will be selected automatically.
    redirect('/inventario?tab=proveedores');
    return null; // This component will not render anything.
}

export default function ProveedoresRedirectPage() {
    return (
        <Suspense fallback={<div>Redireccionando...</div>}>
            <Redirector />
        </Suspense>
    );
}
