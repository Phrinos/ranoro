"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

function Redirector() {
    redirect('/opciones?tab=perfil');
    return null;
}

export default function PerfilRedirectPage() {
    return (
        <Suspense fallback={<div>Redireccionando...</div>}>
            <Redirector />
        </Suspense>
    );
}
