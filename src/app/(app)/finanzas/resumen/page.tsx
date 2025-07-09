
"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

function Redirector() {
    // Redirect to the new unified reports page with the correct tab selected
    redirect('/finanzas/reporte?tab=resumen');
    return null; 
}

export default function ResumenRedirectPage() {
    return (
        <Suspense fallback={<div>Redireccionando...</div>}>
            <Redirector />
        </Suspense>
    );
}
