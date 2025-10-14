"use client";
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';

function FinalCta() {
    return (
        <section className="sticky bottom-0 z-30 w-full bg-primary text-primary-foreground p-3 shadow-2xl print:hidden">
            <div className="container mx-auto flex items-center justify-center gap-4">
                <p className="hidden sm:block font-semibold">Agenda hoy y manejas mejor mañana.</p>
                 <Button size="lg" asChild className="bg-white text-primary hover:bg-gray-200 font-bold">
                    <Link href="https://wa.me/524491425323?text=Hola%2C%20quisiera%20agendar%20una%20cita." target="_blank" rel="noopener noreferrer">Agendar Ahora</Link>
                </Button>
            </div>
        </section>
    )
}

export default FinalCta;
