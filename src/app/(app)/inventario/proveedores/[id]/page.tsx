
"use client";

import { redirect } from 'next/navigation';

export default function OldSupplierDetailRedirect({ params }: { params: { id: string }}) {
    redirect(`/proveedores/${params.id}`);
    return null;
}
