"use client";
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnimatedDiv } from './AnimatedDiv';
import { Icon } from '@iconify/react';
import { Card, CardContent } from '@/components/ui/card';

function LocationSection() {
    return (
        <section id="location" className="py-24 md:py-32 bg-white relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

            <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                    <AnimatedDiv className="lg:col-span-5 flex flex-col justify-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-wider text-xs font-bold mb-6 w-fit">
                            <Icon icon="solar:map-point-bold" className="h-4 w-4" />
                            <span>Ubicación</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
                            Te esperamos en <br/><span className="text-primary text-transparent bg-clip-text bg-linear-to-r from-primary to-primary/60">Ranoro Aguascalientes</span>
                        </h2>
                        <p className="mt-6 text-lg text-slate-500 font-light leading-relaxed">
                            Instalaciones de primer nivel diseñadas para brindarte el mejor servicio automotriz en Aguascalientes.
                        </p>
                        
                        <div className="mt-10 space-y-6">
                            <Card className="border-none bg-slate-50 shadow-xs hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex gap-4 items-start">
                                    <div className="mt-1 rounded-full bg-white p-2 shadow-xs shrink-0 text-primary">
                                        <Icon icon="solar:routing-2-bold-duotone" className="h-6 w-6"/>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900">Dirección</h4>
                                        <p className="text-sm text-slate-600 mt-1 leading-snug">Av. de la Convención de 1914 Sur #1421,<br/>Jardines de la Convención, 20267,<br/>Aguascalientes, Ags.</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-none bg-slate-50 shadow-xs hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex gap-4 items-start">
                                    <div className="mt-1 rounded-full bg-white p-2 shadow-xs shrink-0 text-amber-500">
                                        <Icon icon="solar:clock-circle-bold-duotone" className="h-6 w-6"/>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900">Horarios de Atención</h4>
                                        <p className="text-sm text-slate-600 mt-1">Lunes a Viernes: <span className="font-medium text-slate-900">8:30 AM – 5:30 PM</span></p>
                                        <p className="text-sm text-slate-600">Sábados: <span className="font-medium text-slate-900">8:30 AM - 1:30 PM</span></p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="mt-10">
                             <Button size="lg" asChild className="w-full sm:w-auto h-14 bg-[#25D366] hover:bg-[#1ebd5b] text-white shadow-lg shadow-[#25D366]/20 transition-all hover:-translate-y-1 rounded-2xl group">
                                <Link href="https://wa.me/524491425323?text=Hola%2C%20quisiera%20agendar%20una%20cita%20en%20Ranoro." target="_blank" rel="noopener noreferrer">
                                    <Icon icon="logos:whatsapp-icon" className="mr-2 h-6 w-6 group-hover:scale-110 transition-transform"/>
                                    <span className="text-base font-semibold">Agendar por WhatsApp</span>
                                </Link>
                            </Button>
                        </div>
                    </AnimatedDiv>

                    <AnimatedDiv className="lg:col-span-7 h-full min-h-[400px] lg:min-h-[600px]">
                        <div className="h-full w-full rounded-4xl overflow-hidden border border-slate-200 shadow-2xl relative group">
                            <div className="absolute inset-0 z-10 pointer-events-none ring-1 ring-inset ring-black/10 rounded-4xl" />
                             <iframe 
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3702.570339299484!2d-102.3021980247293!3d21.8741344584067!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8681fe76822c9a91%3A0x8313459c53644f15!2sAv.%20de%20la%20Convenci%C3%B3n%20de%201914%20Sur%201421%2C%20Jardines%20de%20la%20Concepci%C3%B3n%20I%2C%2020267%20Aguascalientes%2C%20Ags.!5e0!3m2!1ses-419!2smx!4v1721855619840!5m2!1ses-419!2smx" 
                                className="w-full h-full grayscale-20 group-hover:grayscale-0 transition-all duration-700" 
                                style={{ border: 0 }} 
                                allowFullScreen 
                                loading="lazy" 
                                referrerPolicy="no-referrer-when-downgrade"
                             ></iframe>
                        </div>
                    </AnimatedDiv>
                </div>
            </div>
        </section>
    );
}

export default LocationSection;
