
"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

function Redirector() {
    // This page is now the main entry point for suppliers
    redirect('/proveedores');
    return null; 
}

export default function ProveedoresRedirectPage() {
    return (
        <Suspense fallback={<div>Redireccionando...</div>}>
            <Redirector />
        </Suspense>
    );
}
