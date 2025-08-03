
"use client";
import React from 'react';
import { BookOpen, DatabaseZap, DollarSign, Users } from 'lucide-react';
import { AnimatedDiv } from './AnimatedDiv';

export function WhyRanoroSection() {
    return (
        <section id="why-ranoro" className="py-20 md:py-28 bg-muted/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold">¿Por qué elegir Ranoro?</h2>
                </AnimatedDiv>
                 <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <AnimatedDiv className="text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-primary mb-2"/>
                        <h4 className="font-bold text-lg">Enfoque vertical</h4>
                        <p className="text-muted-foreground mt-1">Diseñado exclusivamente para talleres, con herramientas pensadas para tu día a día.</p>
                    </AnimatedDiv>
                    <AnimatedDiv className="text-center">
                        <DatabaseZap className="mx-auto h-10 w-10 text-primary mb-2"/>
                        <h4 className="font-bold text-lg">Migración rápida</h4>
                        <p className="text-muted-foreground mt-1">Migra tu información fácil de tus sistemas actuales con nuestro onboarding guiado.</p>
                    </AnimatedDiv>
                    <AnimatedDiv className="text-center">
                        <DollarSign className="mx-auto h-10 w-10 text-primary mb-2"/>
                        <h4 className="font-bold text-lg">Precios accesibles</h4>
                        <p className="text-muted-foreground mt-1">Todo incluido sin compromisos ni aumento en nómina.</p>
                    </AnimatedDiv>
                    <AnimatedDiv className="text-center">
                        <Users className="mx-auto h-10 w-10 text-primary mb-2"/>
                        <h4 className="font-bold text-lg">Soporte continuo</h4>
                        <p className="text-muted-foreground mt-1">Estamos contigo siempre, con actualizaciones y mejoras constantes.</p>
                    </AnimatedDiv>
                </div>
            </div>
        </section>
    );
}
