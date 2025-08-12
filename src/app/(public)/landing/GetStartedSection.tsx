
"use client";
import React from 'react';
import { AnimatedDiv } from './AnimatedDiv';

export function GetStartedSection() {
    return (
        <section id="get-started" className="py-20 md:py-28 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                 <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold">Empieza hoy, sin complicaciones</h2>
                    <p className="mt-4 text-muted-foreground">Nuestro proceso de 4 pasos está diseñado para que transformes tu taller en menos de una hora.</p>
                </AnimatedDiv>
                <AnimatedDiv className="relative mt-16">
                    <div className="absolute top-6 left-0 w-full h-0.5 bg-gray-200 md:block hidden" aria-hidden="true"></div>
                    <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="text-center"><div className="mx-auto h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl border-4 border-white">1</div><h4 className="mt-4 font-semibold">Regístrate</h4><p className="text-sm text-muted-foreground mt-1">Adapta Ranoro a tu taller.</p></div>
                        <div className="text-center"><div className="mx-auto h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl border-4 border-white">2</div><h4 className="mt-4 font-semibold">Activa</h4><p className="text-sm text-muted-foreground mt-1">configura metodos de pago y la informacion de tu taller</p></div>
                        <div className="text-center"><div className="mx-auto h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl border-4 border-white">3</div><h4 className="mt-4 font-semibold">Capacita</h4><p className="text-sm text-muted-foreground mt-1">Tu equipo listo en menos de 1 hora.</p></div>
                        <div className="text-center"><div className="mx-auto h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl border-4 border-white">4</div><h4 className="mt-4 font-semibold">Optimiza</h4><p className="text-sm text-muted-foreground mt-1">Comienza a optimizar tu flujo de trabajo.</p></div>
                    </div>
                </AnimatedDiv>
            </div>
        </section>
    );
}
