"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

function Redirector() {
    redirect('/vehiculos?tab=precios');
    return null;
}

export default function PreciosRedirectPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <Redirector />
        </Suspense>
    );
}
