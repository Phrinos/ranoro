"use client";
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AnimatedDiv } from './AnimatedDiv';
import { Icon } from '@iconify/react';

const services = [
    { 
        name: "Afinación Integral", 
        icon: "twemoji:racing-car",
        description: "Devuelve la potencia y eficiencia a tu motor."
    },
    { 
        name: "Cambio de Aceite", 
        icon: "twemoji:oil-drum",
        description: "Mantenimiento esencial para la vida de tu motor."
    },
    { 
        name: "Diagnóstico por Computadora", 
        icon: "twemoji:laptop",
        description: "Detectamos fallas electrónicas con precisión."
    },
    { 
        name: "Frenos", 
        icon: "twemoji:stop-sign",
        description: "Revisión y reparación para tu máxima seguridad."
    },
    { 
        name: "Suspensión", 
        icon: "twemoji:articulated-lorry",
        description: "Manejo suave, estable y sin ruidos."
    },
    { 
        name: "Hojalatería y Pintura", 
        icon: "twemoji:artist-palette",
        description: "Acabados perfectos con igualado de color digital."
    },
    {
        name: "Reparación de Plásticos",
        icon: "twemoji:plastic-bag",
        description: "Restauramos fascias y molduras a su estado original."
    },
    {
        name: "Servicio a Flotillas",
        icon: "twemoji:delivery-truck",
        description: "Mantenimiento especializado para flotillas y empresas."
    }
];

function ServicesSection() {
    return (
        <section id="services" className="py-20 md:py-28 bg-gray-900 text-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold">Nuestros Servicios</h2>
                </AnimatedDiv>
                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8">
                    {services.map(service => (
                        <AnimatedDiv key={service.name}>
                            <Card className="text-center bg-gray-800/50 border-gray-700 h-full">
                                <CardHeader>
                                    <Icon icon={service.icon} className="h-12 w-12 mx-auto text-primary"/>
                                </CardHeader>
                                <CardContent>
                                    <h3 className="font-semibold text-white">{service.name}</h3>
                                    <p className="text-xs text-gray-400 mt-1">{service.description}</p>
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
