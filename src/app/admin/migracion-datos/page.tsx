
"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

function Redirector() {
    // Redirect to the new unified page with the correct tab and subtab selected
    redirect('/opciones?tab=administracion&subtab=migracion');
    return null;
}

export default function MigracionDatosRedirectPage() {
    return (
        <Suspense fallback={<div>Redireccionando...</div>}>
            <Redirector />
        </Suspense>
    );
}
