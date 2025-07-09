
"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

// This page's content is now integrated into the main services page.
function Redirector() {
    redirect('/servicios/historial'); 
    return null;
}

export default function AgendaRedirectPage() {
    return (
        <Suspense fallback={<div>Redireccionando...</div>}>
            <Redirector />
        </Suspense>
    );
}
