

"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

function Redirector() {
    // Redirect to the new unified page with the correct tab selected
    redirect('/finanzas?tab=operaciones');
    return null;
}

export default function ReporteRedirectPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <Redirector />
        </Suspense>
    );
}
