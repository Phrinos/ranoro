
"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedDiv } from './AnimatedDiv';
import Image from "next/image";

function BeforeAfterSection() {
    return (
        <section id="before-after" className="py-20 md:py-28 bg-muted/50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center max-w-3xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-extrabold">Resultados que se ven</h2>
                    <p className="mt-4 text-lg text-foreground">
                        Especialistas en hojalatería y pintura con igualado de color por computadora y materiales de la más alta calidad.
                    </p>
                </AnimatedDiv>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <AnimatedDiv>
                        <Card>
                            <CardHeader>
                                 <Image src="https://picsum.photos/seed/bf1/600/400" alt="Golpe en facia" width={600} height={400} className="rounded-t-lg" data-ai-hint="car bumper damage" />
                                <CardTitle className="pt-4">Golpe en Fascia</CardTitle>
                            </CardHeader>
                        </Card>
                    </AnimatedDiv>
                     <AnimatedDiv>
                        <Card>
                            <CardHeader>
                                 <Image src="https://picsum.photos/seed/bf2/600/400" alt="Rayón en puerta" width={600} height={400} className="rounded-t-lg" data-ai-hint="car door scratch" />
                                <CardTitle className="pt-4">Rayón Profundo en Puerta</CardTitle>
                            </CardHeader>
                        </Card>
                    </AnimatedDiv>
                     <AnimatedDiv>
                        <Card>
                            <CardHeader>
                                <Image src="https://picsum.photos/seed/bf3/600/400" alt="Cofre con daño de granizo" width={600} height={400} className="rounded-t-lg" data-ai-hint="car hood hail damage" />
                                <CardTitle className="pt-4">Daño por Granizo en Cofre</CardTitle>
                            </CardHeader>
                        </Card>
                    </AnimatedDiv>
                </div>
            </div>
        </section>
    );
}

export default BeforeAfterSection;
