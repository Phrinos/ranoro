
"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

// This page is obsolete. All new work items are created from the "/servicios/nuevo" page.
// We redirect to maintain a consistent user flow.
function Redirector() {
    redirect('/servicios/nuevo');
    return null;
}

export default function NuevaCotizacionRedirectPage() {
    return (
        <Suspense fallback={<div>Redireccionando...</div>}>
            <Redirector />
        </Suspense>
    );
}
