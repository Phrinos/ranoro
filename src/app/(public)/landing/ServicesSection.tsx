"use client";
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StaggerContainer, StaggerItem, AnimatedDiv } from './AnimatedDiv';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

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
        name: "Diagnóstico Computarizado", 
        icon: "twemoji:laptop",
        description: "Detectamos fallas electrónicas con precisión OEM."
    },
    { 
        name: "Frenos ABS/EBD", 
        icon: "twemoji:stop-sign",
        description: "Revisión y reparación para tu máxima seguridad."
    },
    { 
        name: "Suspensión y Dirección", 
        icon: "twemoji:articulated-lorry",
        description: "Manejo suave, estable y sin ruidos en el volante."
    },
    { 
        name: "Hojalatería y Pintura", 
        icon: "twemoji:artist-palette",
        description: "Acabados perfectos con igualado de color digital."
    },
    {
        name: "Reparación de Plásticos",
        icon: "twemoji:hammer",
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
        <section id="services" className="relative py-24 md:py-32 bg-[#09090b] text-white overflow-hidden">
            {/* Dark premium background effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[600px] bg-primary/10 blur-[150px] rounded-[100%] pointer-events-none" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[40px_40px] pointer-events-none" />

            <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
                        Centro de Servicio Especializado
                    </h2>
                    <p className="text-lg md:text-xl text-gray-400 font-light">
                        Tecnología de punta y mecánicos certificados para cada necesidad de tu vehículo.
                    </p>
                </AnimatedDiv>
                
                <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8" staggerDelay={0.1}>
                    {services.map((service, index) => (
                        <StaggerItem key={service.name} className="h-full">
                            <motion.div 
                              whileHover={{ y: -8, scale: 1.03 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                              className="group h-full"
                            >
                                <Card className="text-center bg-white/5 backdrop-blur-md border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all duration-300 h-full flex flex-col justify-center rounded-3xl overflow-hidden relative">
                                    <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                    
                                    <CardHeader className="pb-2">
                                        <div className="mx-auto h-20 w-20 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/30 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6">
                                            <Icon icon={service.icon} className="h-10 w-10 text-primary drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"/>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">{service.name}</h3>
                                        <p className="text-sm font-light text-gray-400 leading-relaxed">{service.description}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </StaggerItem>
                    ))}
                </StaggerContainer>
            </div>
        </section>
    );
}

export default ServicesSection;
