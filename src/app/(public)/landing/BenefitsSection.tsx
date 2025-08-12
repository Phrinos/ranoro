
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedDiv } from './AnimatedDiv';
import { Icon } from '@iconify/react';

export function BenefitsSection() {
    return (
        <section id="benefits" className="py-20 md:py-28 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm sm:text-base">Beneficios Claros</Badge>
                    <h2 className="text-3xl md:text-4xl font-extrabold">Resultados Tangibles para tu Taller</h2>
                </AnimatedDiv>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                    <AnimatedDiv><Card><CardHeader><Icon icon="twemoji:man-mechanic-light-skin-tone" className="mx-auto h-12 w-12 mb-2"/><CardTitle>Sin personal extra</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Con tu equipo actual y Ranoro, cubres tareas de atención, comunicación y gestión eficientemente.</p></CardContent></Card></AnimatedDiv>
                    <AnimatedDiv><Card><CardHeader><Icon icon="emojione:money-bag" className="mx-auto h-12 w-12 mb-2"/><CardTitle>Optimización de ingresos</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">La comunicación proactiva incentiva visitas y servicios adicionales.</p></CardContent></Card></AnimatedDiv>
                    <AnimatedDiv><Card><CardHeader><Icon icon="emojione:top-hat" className="mx-auto h-12 w-12 mb-2"/><CardTitle>Experiencia premium</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Tus clientes sentirán el trato de agencia: profesionalismo, tecnología y cuidado.</p></CardContent></Card></AnimatedDiv>
                    <AnimatedDiv><Card><CardHeader><Icon icon="twemoji:bullseye" className="mx-auto h-12 w-12 mb-2"/><CardTitle>Visión estratégica</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Datos utilizables que maximizan la rentabilidad y fidelización de tus clientes.</p></CardContent></Card></AnimatedDiv>
                </div>
            </div>
        </section>
    );
}
