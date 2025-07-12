
"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

function Redirector() {
    // Redirect to the new unified page with the correct tab selected
    redirect('/finanzas?tab=resumen');
    return null;
}

export default function ResumenRedirectPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <Redirector />
        </Suspense>
    );
}
