
"use client";
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnimatedDiv } from './AnimatedDiv';

export function CtaSection() {
    return (
        <section id="get-started-cta" className="py-20 md:py-28 bg-gray-800 text-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
                 <AnimatedDiv>
                    <h2 className="text-3xl md:text-4xl font-extrabold">¿Listo para profesionalizar tu taller?</h2>
                    <p className="mt-4 text-base sm:text-lg text-gray-300">
                        Dale a tus clientes la atención de una agencia, mejora tus ingresos y conserva tu equipo actual.
                    </p>
                    <Button size="lg" className="mt-8" asChild>
                        <Link href="https://wa.me/524493930914" target="_blank" rel="noopener noreferrer">Solicita una demo</Link>
                    </Button>
                 </AnimatedDiv>
            </div>
        </section>
    );
}
