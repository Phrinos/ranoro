

"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

function Redirector() {
    redirect('/servicios/agenda');
    return null;
}

export default function ServiciosRedirectPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <Redirector />
        </Suspense>
    );
}
