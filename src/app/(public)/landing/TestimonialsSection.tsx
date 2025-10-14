
"use client";
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedDiv } from './AnimatedDiv';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@iconify/react';

const testimonials = [
    {
        quote: "Precio justo y me explicaron todo.",
        author: "Carlos M."
    },
    {
        quote: "Pintaron la puerta y quedó como nueva.",
        author: "Laura R."
    },
    {
        quote: "Regresé por la afinación; consumía menos gasolina.",
        author: "Ernesto P."
    },
];

export function TestimonialsSection() {
    return (
        <section id="testimonials" className="py-20 md:py-28 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                 <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold">Lo que dicen nuestros clientes</h2>
                </AnimatedDiv>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <AnimatedDiv key={index}>
                            <Card className="border-l-4 border-primary h-full">
                                <CardContent className="p-6">
                                    <div className="flex gap-1 text-yellow-400 mb-2">
                                        <Icon icon="mdi:star" className="h-5 w-5"/>
                                        <Icon icon="mdi:star" className="h-5 w-5"/>
                                        <Icon icon="mdi:star" className="h-5 w-5"/>
                                        <Icon icon="mdi:star" className="h-5 w-5"/>
                                        <Icon icon="mdi:star" className="h-5 w-5"/>
                                    </div>
                                    <p className="text-lg italic text-muted-foreground">“{testimonial.quote}”</p>
                                    <p className="mt-4 font-semibold">— {testimonial.author}</p>
                                </CardContent>
                            </Card>
                        </AnimatedDiv>
                    ))}
                </div>
                 <div className="mt-16 pt-10 border-t border-gray-200 flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
                    <Badge variant="secondary" className="px-4 py-2 text-base">15+ años de experiencia</Badge>
                    <Badge variant="secondary" className="px-4 py-2 text-base">5,000+ vehículos atendidos</Badge>
                </div>
            </div>
        </section>
    );
}
