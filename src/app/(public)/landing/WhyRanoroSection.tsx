"use client";
import React from 'react';
import { StaggerContainer, StaggerItem, AnimatedDiv } from './AnimatedDiv';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

const benefits = [
    {
        icon: "twemoji:scroll",
        title: "Transparencia Total",
        description: "Precios por escrito y explicaciones claras antes de empezar cualquier trabajo. Sin sorpresas.",
    },
    {
        icon: "twemoji:shield",
        title: "Garantía Ranoro",
        description: "Ofrecemos 60 dias o 1000km de garantía en mano de obra para tu total tranquilidad.",
    },
    {
        icon: "twemoji:stopwatch",
        title: "Entrega a Tiempo",
        description: "Te mantenemos informado por WhatsApp con fotos y videos del proceso para que sepas cuándo estará listo tu auto.",
    },
    {
        icon: "twemoji:artist-palette",
        title: "Carrocería Profesional",
        description: "Usamos igualado de color por computadora y materiales de alto desempeño para un acabado impecable.",
    },
];

export function WhyRanoroSection() {
    return (
        <section id="why-ranoro" className="relative py-24 md:py-32 bg-white overflow-hidden">
            <div className="absolute inset-0 bg-grid-slate-100/[0.04] bg-[bottom_1px_center] opacity-20" />
            
            <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center max-w-3xl mx-auto mb-20">
                    <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                      ¿Por qué elegirnos?
                    </h2>
                    <p className="mt-4 text-xl text-slate-600 font-light">
                      Nuestra filosofía se basa en honestidad, rapidez y calidad insuperable.
                    </p>
                </AnimatedDiv>

                 <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12" staggerDelay={0.15}>
                    {benefits.map((benefit, index) => (
                        <StaggerItem key={benefit.title} className="h-full">
                            <motion.div 
                              whileHover={{ y: -8 }}
                              transition={{ type: "spring", stiffness: 300 }}
                              className="group h-full bg-slate-50 hover:bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 text-center flex flex-col items-center"
                            >
                                <div className="mb-6 h-20 w-20 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                    <Icon icon={benefit.icon} className="h-10 w-10"/>
                                </div>
                                <h4 className="font-bold text-xl text-slate-900 mb-3">{benefit.title}</h4>
                                <p className="text-slate-600 leading-relaxed font-light">{benefit.description}</p>
                            </motion.div>
                        </StaggerItem>
                    ))}
                </StaggerContainer>
            </div>
        </section>
    );
}
