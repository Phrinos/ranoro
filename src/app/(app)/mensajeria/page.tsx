

"use client";

import { redirect, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function Redirector() {
    redirect('/administracion?tab=mensajeria');
    return null;
}

export default function MensajeriaRedirectPage() {
    return (
        <Suspense fallback={<div>Redireccionando...</div>}>
            <Redirector />
        </Suspense>
    );
}
