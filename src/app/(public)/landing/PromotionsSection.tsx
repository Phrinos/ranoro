// src/app/(public)/landing/PromotionsSection.tsx
"use client";
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { StaggerContainer, StaggerItem, AnimatedDiv } from './AnimatedDiv';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { capitalizeWords, cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';

const whatsappUrl = "https://wa.me/524491425323?text=Vengo%20de%20su%20sitio%20web";

export function PromotionsSection() {
    const currentMonthAndYear = capitalizeWords(format(new Date(), "MMMM yyyy", { locale: es }));

    return (
        <section id="promotions" className="relative py-24 md:py-32 bg-background overflow-hidden overflow-x-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
                <AnimatedDiv className="text-center max-w-3xl mx-auto mb-16">
                  <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                    Promociones {currentMonthAndYear}
                  </h2>
                  <p className="mt-4 text-xl text-muted-foreground font-light leading-relaxed">
                    Aprovecha nuestros paquetes exclusivos y mantén tu vehículo en nivel de agencia.
                  </p>
                </AnimatedDiv>

                <StaggerContainer className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12" staggerDelay={0.2}>
                    
                    {/* Promo Card 1 */}
                    <StaggerItem>
                        <div className="h-full group transition-all duration-500 ease-out hover:-translate-y-2">
                          <Card className="relative bg-card dark:bg-slate-900 border-border/40 shadow-2xl h-full flex flex-col rounded-4xl overflow-hidden transition-shadow duration-500 group-hover:shadow-primary/20 group-hover:shadow-2xl">
                              <CardHeader className="bg-primary/5 pb-6">
                                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
                                    <Icon icon="lucide:droplets" className="h-6 w-6" />
                                  </div>
                                  <CardTitle className="text-2xl font-bold">Pack Aceite Plus</CardTitle>
                                  <CardDescription className="text-base mt-2">
                                      Lubricación premium sintética y revisión completa de seguridad de regalo.
                                  </CardDescription>
                              </CardHeader>
                              <CardContent className="grow space-y-6 pt-6">
                                 <div className="grid grid-cols-2 gap-4">
                                      <div className="p-4 bg-background/50 border border-border/50 rounded-2xl text-center group-hover:border-primary/50 transition-colors">
                                          <Icon icon="twemoji:automobile" className="mx-auto h-8 w-8 mb-2"/>
                                          <p className="font-extrabold text-2xl text-foreground">$799</p>
                                          <p className="text-sm font-medium text-muted-foreground">Autos Sedán</p>
                                      </div>
                                      <div className="p-4 bg-background/50 border border-border/50 rounded-2xl text-center group-hover:border-primary/50 transition-colors">
                                          <Icon icon="twemoji:delivery-truck" className="mx-auto h-8 w-8 mb-2"/>
                                          <p className="font-extrabold text-2xl text-foreground">$999</p>
                                          <p className="text-sm font-medium text-muted-foreground">SUV & Pick-Up</p>
                                      </div>
                                 </div>
                                 
                                 <div className="text-center font-bold text-green-600 bg-green-500/10 border border-green-500/20 py-3 rounded-xl flex items-center justify-center gap-2">
                                   <Icon icon="lucide:gift" className="h-5 w-5" />
                                   GRATIS: Filtro de Aire
                                 </div>

                                  <div className="space-y-3">
                                      <h4 className="font-semibold text-foreground tracking-wider text-xs uppercase text-primary">¿Qué incluye?</h4>
                                      <ul className="space-y-3">
                                          <li className="flex items-start">
                                            <div className="mr-3 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/20">
                                              <Icon icon="lucide:check" className="h-3 w-3 text-primary" />
                                            </div>
                                            <span className="text-muted-foreground leading-relaxed">Hasta 5L de aceite sintético Raloy</span>
                                          </li>
                                          <li className="flex items-start">
                                            <div className="mr-3 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/20">
                                              <Icon icon="lucide:check" className="h-3 w-3 text-primary" />
                                            </div>
                                            <span className="text-muted-foreground leading-relaxed">Filtro de Aceite de Alta Calidad</span>
                                          </li>
                                      </ul>
                                  </div>
                              </CardContent>
                              <div className="p-6 pt-0 mt-auto">
                                  <Button asChild className="w-full rounded-xl h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all">
                                      <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">Solicitar Promoción</Link>
                                  </Button>
                                  <p className="text-[10px] text-muted-foreground text-center mt-4">
                                      *Válido para la mayoría de vehículos. Aplican restricciones de marca premium.
                                  </p>
                              </div>
                          </Card>
                        </div>
                    </StaggerItem>

                    {/* Promo Card 2 */}
                    <StaggerItem>
                        <div className="h-full group transition-all duration-500 ease-out hover:-translate-y-2">
                          <Card className="relative bg-card dark:bg-slate-900 border-border/40 shadow-2xl h-full flex flex-col rounded-4xl overflow-hidden transition-shadow duration-500 group-hover:shadow-primary/20 group-hover:shadow-2xl">
                              <CardHeader className="bg-primary pb-6 text-primary-foreground relative overflow-hidden">
                                  {/* Decorative background for the header */}
                                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                                  
                                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-xs relative z-10">
                                    <Icon icon="lucide:settings" className="h-6 w-6" />
                                  </div>
                                  <CardTitle className="text-2xl font-bold relative z-10">Afinación Mayor</CardTitle>
                                  <CardDescription className="text-primary-foreground/80 text-base mt-2 relative z-10">
                                      Restaura el consumo y potencia al 100%. Desde <strong className="text-white text-xl ml-1">$1,999</strong>
                                  </CardDescription>
                              </CardHeader>
                              <CardContent className="grow space-y-6 pt-6">
                                  <div className="space-y-4">
                                      <h4 className="font-semibold text-foreground tracking-wider text-xs uppercase text-primary">Proceso Integral de 6 Pasos:</h4>
                                      <ul className="space-y-3">
                                          {[
                                            "Aceite Mineral Raloy + Filtros (Aire/Gasolina)",
                                            "Cambio de Bujías Champion/NGK (hasta 4 cil)",
                                            "Lavado de Inyectores x Ultrasonido",
                                            "Clínica de Cuerpo de Aceleración y Válvulas",
                                            "Scanner de Diagnóstico Avanzado",
                                            "Inspección Computarizada 26 Puntos"
                                          ].map((item, i) => (
                                            <li key={i} className="flex items-start">
                                              <div className="mr-3 mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                                                <span className="text-[10px] font-bold text-primary">{i+1}</span>
                                              </div>
                                              <span className="text-sm font-medium text-muted-foreground leading-relaxed">{item}</span>
                                            </li>
                                          ))}
                                      </ul>
                                  </div>
                                  
                                  <Separator className="bg-border/50" />
                                  
                                  <div className="bg-background/50 p-4 rounded-xl border border-border/50">
                                      <h4 className="font-semibold text-foreground tracking-wider text-xs uppercase mb-3 flex items-center gap-2">
                                        <Icon icon="lucide:zap" className="h-4 w-4 text-yellow-500" />
                                        Upgrades Opcionales
                                      </h4>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                          <div className="flex justify-between items-center"><span className="text-muted-foreground">Bujía Platino</span><span className="font-bold text-foreground">+$390</span></div>
                                          <div className="flex justify-between items-center"><span className="text-muted-foreground">Bujía Iridio</span><span className="font-bold text-foreground">+$690</span></div>
                                          <div className="flex justify-between items-center"><span className="text-muted-foreground">Sintético Raloy</span><span className="font-bold text-foreground">+$490</span></div>
                                          <div className="flex justify-between items-center"><span className="text-muted-foreground">Sintético Mobil</span><span className="font-bold text-foreground">+$790</span></div>
                                      </div>
                                  </div>
                              </CardContent>
                               <div className="p-6 pt-0 mt-auto">
                                  <Button asChild className="w-full rounded-xl h-14 text-lg font-bold bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-lg hover:shadow-xl transition-all">
                                      <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">Agendar Servicio</Link>
                                  </Button>
                              </div>
                          </Card>
                        </div>
                    </StaggerItem>

                </StaggerContainer>
            </div>
        </section>
    );
}
