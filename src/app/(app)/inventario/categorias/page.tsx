
"use client";

import { redirect } from 'next/navigation';
import { Suspense } from 'react';

function Redirector() {
    // We redirect to the main inventory page, which now contains this content in a tab.
    // The tab will be selected automatically.
    redirect('/inventario?tab=categorias');
    return null; // This component will not render anything.
}

export default function CategoriasRedirectPage() {
    return (
        <Suspense fallback={<div>Redireccionando...</div>}>
            <Redirector />
        </Suspense>
    );
}
