"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

function Redirector() {
    redirect('/opciones?tab=manual');
    return null;
}

export default function ManualRedirectPage() {
    return (
        <Suspense fallback={<div>Redireccionando...</div>}>
            <Redirector />
        </Suspense>
    );
}
