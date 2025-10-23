"use client";
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnimatedDiv } from './AnimatedDiv';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { capitalizeWords } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Icon } from '@iconify/react';

const whatsappUrl = "https://wa.me/524491425323?text=Vengo%20de%20su%20sitio%20web";

export function PromotionsSection() {
    const currentMonthAndYear = capitalizeWords(format(new Date(), "MMMM yyyy", { locale: es }));

    return (
        <section id="promotions" className="py-20 md:py-28 bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center max-w-3xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-extrabold">Promociones del Mes de {currentMonthAndYear}</h2>
                  <p className="mt-4 text-lg text-muted-foreground">
                    Aprovecha nuestros precios especiales en servicios esenciales para mantener tu auto en perfecto estado.
                  </p>
                </AnimatedDiv>
                <div className="mt-12 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                    <AnimatedDiv>
                        <Card className="bg-card/80 backdrop-blur-sm border-primary/50 shadow-lg h-full flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-xl text-primary">Cambio de Aceite</CardTitle>
                                <CardDescription>
                                    Servicio de cambio de aceite con aceite sintético y revisión de seguridad.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                               <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="p-3 bg-muted/50 rounded-lg">
                                        <Icon icon="twemoji:automobile" className="mx-auto h-6 w-6 text-primary"/>
                                        <p className="font-bold text-lg mt-1">$799</p>
                                        <p className="text-xs text-muted-foreground">Autos</p>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg">
                                        <Icon icon="twemoji:delivery-truck" className="mx-auto h-6 w-6 text-primary"/>
                                        <p className="font-bold text-lg mt-1">$999</p>
                                        <p className="text-xs text-muted-foreground">SUV / Pick-Up</p>
                                    </div>
                               </div>
                               <div className="text-center font-bold text-green-600 bg-green-100 p-2 rounded-md">
                                 GRATIS: Filtro de Aire
                               </div>
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2 text-sm">INCLUYE:</h4>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex items-start"><Icon icon="twemoji:check-mark-button" className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0"/><span className="text-muted-foreground">Hasta 5L de aceite sintético Raloy</span></li>
                                        <li className="flex items-start"><Icon icon="twemoji:check-mark-button" className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0"/><span className="text-muted-foreground">Filtro de Aceite Estándar</span></li>
                                    </ul>
                                </div>
                                <div className="text-xs text-muted-foreground pt-4 border-t">
                                    <Icon icon="twemoji:information" className="h-4 w-4 inline mr-1"/>
                                    Válido para todos los vehículos excepto Acura, BMW, Mercedes Benz, Audi, GMC, Lincoln, Land Rover, Lexus, Porsche, Infiniti y Cadillac.
                                </div>
                            </CardContent>
                            <div className="p-6 pt-0">
                                <Button asChild className="w-full">
                                    <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">Cotizar mi Vehículo</Link>
                                </Button>
                            </div>
                        </Card>
                    </AnimatedDiv>
                    <AnimatedDiv>
                        <Card className="bg-card/80 backdrop-blur-sm border-primary/50 shadow-lg h-full flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-xl text-primary">Afinación Integral desde $1,999</CardTitle>
                                <CardDescription>
                                    Servicio completo para restaurar la eficiencia y potencia de tu motor.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground flex-grow space-y-4">
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">INCLUYE:</h4>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>Aceite Raloy Mineral y filtro de aceite</li>
                                        <li>Filtro de aire y gasolina (externo)</li>
                                        <li>Bujías de cobre Champion/NGK (hasta 4)</li>
                                        <li>Lavado de inyectores por ultrasonido</li>
                                        <li>Limpieza de cuerpo de aceleración y válvulas PCV/IAC</li>
                                        <li>Revisión de 26 puntos de seguridad y relleno de líquidos</li>
                                    </ul>
                                </div>
                                <Separator />
                                <div>
                                    <h4 className="font-semibold text-foreground mb-2">MEJORA TU PAQUETE:</h4>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        <span className="font-medium">Bujía Platino:</span><span className="font-bold">+$390</span>
                                        <span className="font-medium">Bujía Iridio:</span><span className="font-bold">+$690</span>
                                        <span className="font-medium">Aceite Sintético Raloy:</span><span className="font-bold">+$490</span>
                                        <span className="font-medium">Aceite Sintético Mobil:</span><span className="font-bold">+$790</span>
                                    </div>
                                </div>
                            </CardContent>
                             <div className="p-6 pt-0">
                                <Button asChild className="w-full">
                                    <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">Cotizar mi Vehículo</Link>
                                </Button>
                            </div>
                        </Card>
                    </AnimatedDiv>
                </div>
            </div>
        </section>
    );
}
