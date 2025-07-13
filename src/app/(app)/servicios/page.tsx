/* app/(app)/servicios/page.tsx
   — PÉGALO TAL CUAL —                                                   */

   'use client'

    import { redirect } from 'next/navigation';

    // This page is now obsolete.
    // The main entry point is /servicios/historial
    export default function ServiciosRedirectPage() {
        redirect('/servicios/historial');
        return null;
    }
   
