
"use client";
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedDiv } from './AnimatedDiv';

export function TestimonialsSection() {
    return (
        <section id="testimonials" className="py-20 md:py-28 bg-muted/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
                 <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold">Casos de Éxito</h2>
                    <p className="mt-4 text-lg text-foreground">Lo que nuestros clientes dicen sobre nosotros.</p>
                </AnimatedDiv>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <AnimatedDiv><Card className="border-l-4 border-primary">
                        <CardContent className="p-6">
                            <p className="text-lg italic">“Gracias a Ranoro, mi taller aumentó un 25% su volumen de citas recurrentes, sin contratar más.”</p>
                            <p className="mt-4 font-semibold">— Ranoro - Aguascalientes</p>
                        </CardContent>
                    </Card></AnimatedDiv>
                     <AnimatedDiv><Card className="border-l-4 border-primary">
                        <CardContent className="p-6">
                            <p className="text-lg italic">“Las aprobaciones vía url durante los servicios nos ayudaron a incrementar nuestros ingresos en reparaciones unilaterales.”</p>
                            <p className="mt-4 font-semibold">— AutoPRO CDMX</p>
                        </CardContent>
                    </Card></AnimatedDiv>
                     <AnimatedDiv><Card className="border-l-4 border-primary">
                        <CardContent className="p-6">
                            <p className="text-lg italic">&quot;Implementar el reporte fotográfico de seguridad nos ha dado una ventaja competitiva enorme. Los clientes se sienten más seguros.&quot;</p>
                            <p className="mt-4 font-semibold">— ServiExpress - Bogotá, Colombia</p>
                        </CardContent>
                    </Card></AnimatedDiv>
                     <AnimatedDiv><Card className="border-l-4 border-primary">
                        <CardContent className="p-6">
                            <p className="text-lg italic">&quot;El análisis de inventario con IA nos ahorró miles en compras innecesarias. Ahora solo compramos lo que de verdad se necesita.&quot;</p>
                            <p className="mt-4 font-semibold">— Garaje Central - Santiago, Chile</p>
                        </CardContent>
                    </Card></AnimatedDiv>
                </div>
            </div>
        </section>
    );
}
