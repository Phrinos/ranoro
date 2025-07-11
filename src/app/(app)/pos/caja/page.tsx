
"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

function Redirector() {
    // Redirect to the new unified page with the correct tab selected
    redirect('/pos');
    return null;
}

export default function CajaRedirectPage() {
    return (
        <Suspense fallback={<div>Redireccionando...</div>}>
            <Redirector />
        </Suspense>
    );
}
