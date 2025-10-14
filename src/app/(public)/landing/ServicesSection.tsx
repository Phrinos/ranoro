
"use client";
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AnimatedDiv } from './AnimatedDiv';
import { Icon } from '@iconify/react';
import { Clock, DraftingCompass, ShieldCheck, Wind, Car } from 'lucide-react';

const services = [
    { name: "Mantenimiento y diagnósticos", icon: Clock },
    { name: "Frenos y suspensión", icon: Car },
    { name: "Enfriamiento y dirección", icon: "mdi:car-coolant-level" },
    { name: "Hojalatería y pintura", icon: Wind },
    { name: "Eléctrico y escaneo OBD-II", icon: DraftingCompass },
    { name: "Flotillas y empresas", icon: "emojione:delivery-truck" },
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
                                    {typeof service.icon === 'string' ? <Icon icon={service.icon} className="h-10 w-10 mx-auto text-primary"/> : <service.icon className="h-10 w-10 mx-auto text-primary" />}
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
