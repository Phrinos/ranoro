"use client";
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AnimatedDiv } from './AnimatedDiv';
import { Icon } from '@iconify/react';

const services = [
    { name: "Afinación Integral", icon: "twemoji:station" },
    { name: "Cambio de Aceite", icon: "twemoji:oil-drum" },
    { name: "Diagnóstico por Computadora", icon: "twemoji:laptop" },
    { name: "Frenos", icon: "twemoji:stop-sign" },
    { name: "Suspensión", icon: "twemoji:racing-car" },
    { name: "Hojalatería y Pintura", icon: "twemoji:artist-palette" },
];

function ServicesSection() {
    return (
        <section id="services" className="py-20 md:py-28 bg-gray-900 text-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold">Nuestros Servicios</h2>
                </AnimatedDiv>
                <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-8">
                    {services.map(service => (
                        <AnimatedDiv key={service.name}>
                            <Card className="text-center bg-gray-800/50 border-gray-700 h-full">
                                <CardHeader>
                                    <Icon icon={service.icon} className="h-12 w-12 mx-auto text-primary"/>
                                </CardHeader>
                                <CardContent>
                                    <h3 className="font-semibold text-white">{service.name}</h3>
                                </CardContent>
                            </Card>
                        </AnimatedDiv>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default ServicesSection;
