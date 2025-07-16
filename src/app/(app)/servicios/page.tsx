

"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

// This page is now obsolete.
// The main entry point is /servicios/historial
function Redirector() {
    redirect('/servicios/historial');
    return null;
}

export default function ServiciosRedirectPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <Redirector />
        </Suspense>
    );
}
