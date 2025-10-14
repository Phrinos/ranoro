
"use client";
import React from 'react';
import { AnimatedDiv } from './AnimatedDiv';
import { Icon } from '@iconify/react';

const benefits = [
    {
        icon: "mdi:file-document-check-outline",
        title: "Transparencia Total",
        description: "Precios por escrito y explicaciones claras antes de empezar cualquier trabajo. Sin sorpresas.",
    },
    {
        icon: "mdi:shield-check-outline",
        title: "Garantía Ranoro",
        description: "Ofrecemos 90 días o 3,000 km de garantía en mano de obra para tu total tranquilidad.",
    },
    {
        icon: "mdi:clock-fast",
        title: "Entrega a Tiempo",
        description: "Te mantenemos informado por WhatsApp con fotos y videos del proceso para que sepas cuándo estará listo tu auto.",
    },
    {
        icon: "mdi:air-filter",
        title: "Carrocería Profesional",
        description: "Usamos igualado de color por computadora y materiales de alto desempeño para un acabado impecable.",
    },
];

export function WhyRanoroSection() {
    return (
        <section id="why-ranoro" className="py-20 md:py-28 bg-muted/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold">¿Por qué elegirnos?</h2>
                </AnimatedDiv>
                 <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {benefits.map(benefit => (
                        <AnimatedDiv key={benefit.title} className="text-center">
                            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                <Icon icon={benefit.icon} className="h-8 w-8"/>
                            </div>
                            <h4 className="font-bold text-lg mt-4">{benefit.title}</h4>
                            <p className="text-muted-foreground mt-1 text-sm">{benefit.description}</p>
                        </AnimatedDiv>
                    ))}
                </div>
            </div>
        </section>
    );
}
