
"use client";

import { redirect } from 'next/navigation';

export function CotizacionesRedirectPageComponent() {
    redirect('/servicios/historial?tab=cotizaciones');
    return null;
}
