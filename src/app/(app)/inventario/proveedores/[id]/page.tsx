"use server";

import { redirect } from 'next/navigation';

// This is a server component that handles redirection from the old URL.
export default function OldSupplierDetailRedirect({ params }: { params: { id: string }}) {
    redirect(`/proveedores/${params.id}`);
}
