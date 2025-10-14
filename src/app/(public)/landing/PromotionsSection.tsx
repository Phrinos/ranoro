"use client";
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnimatedDiv } from './AnimatedDiv';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function PromotionsSection() {
    return (
        <section id="promotions" className="py-20 md:py-28 bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center max-w-3xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-extrabold">Promociones del Mes</h2>
                  <p className="mt-4 text-lg text-muted-foreground">
                    Aprovecha nuestros precios especiales en servicios esenciales para mantener tu auto en perfecto estado.
                  </p>
                </AnimatedDiv>
                <div className="mt-12 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                    <AnimatedDiv>
                        <Card className="bg-card/80 backdrop-blur-sm border-primary/50 shadow-lg h-full flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-xl text-primary">Cambio de aceite $799</CardTitle>
                                <CardDescription>
                                    Incluye hasta 4L de aceite 5W-30 semisintético, filtro estándar y revisión de 15 puntos.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground flex-grow">
                                <p>Aplica a: 4 cilindros aspirados (sedanes/hatchback).</p>
                                <p>Extras: aceite sintético, litros adicionales o filtros premium tienen costo adicional.</p>
                            </CardContent>
                            <div className="p-6 pt-0">
                                <Button size="sm" variant="link" className="p-0 h-auto text-primary" asChild>
                                    <Link href="/promo/cambio-de-aceite">Ver detalles de la promoción</Link>
                                </Button>
                            </div>
                        </Card>
                    </AnimatedDiv>
                    <AnimatedDiv>
                        <Card className="bg-card/80 backdrop-blur-sm border-primary/50 shadow-lg h-full flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-xl text-primary">Afinación integral $1,999</CardTitle>
                                <CardDescription>
                                    Cambio de bujías, limpieza de cuerpo de aceleración, lavado de inyectores, filtro de aire y escaneo.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground flex-grow">
                                <p>No incluye: bujías iridium/platino, filtro de combustible externo, bobinas/sensores. Turbo o V6/V8 requiere cotización.</p>
                            </CardContent>
                             <div className="p-6 pt-0">
                                <Button size="sm" variant="link" className="p-0 h-auto text-primary" asChild>
                                    <Link href="/promo/afinacion-integral">Ver detalles de la promoción</Link>
                                </Button>
                            </div>
                        </Card>
                    </AnimatedDiv>
                </div>
            </div>
        </section>
    );
}
