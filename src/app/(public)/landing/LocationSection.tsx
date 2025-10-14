"use client";
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnimatedDiv } from './AnimatedDiv';
import { Icon } from '@iconify/react';

function LocationSection() {
    return (
        <section id="location" className="py-20 md:py-28 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <AnimatedDiv>
                        <h2 className="text-3xl font-extrabold">Visítanos o Contáctanos</h2>
                        <p className="mt-4 text-muted-foreground">Estamos listos para atenderte.</p>
                        <div className="mt-8 space-y-4 text-lg">
                            <div className="flex items-center gap-4"><Icon icon="twemoji:round-pushpin" className="h-6 w-6 text-primary"/><p>Av. de la Convencion de 1914 Sur #1421, Jardines de la Convencion, 20267, Aguascalientes, Aguascalientes.</p></div>
                            <div className="flex items-center gap-4"><Icon icon="twemoji:alarm-clock" className="h-6 w-6 text-primary"/><p>Lunes a Viernes: 8:30 AM – 5:30 PM | Sábados: 8:30 AM - 1:30 PM</p></div>
                            <div className="flex items-center gap-4"><Icon icon="twemoji:credit-card" className="h-6 w-6 text-primary"/><p>Aceptamos: Efectivo, Tarjeta, Transferencia</p></div>
                        </div>
                        <div className="mt-8 flex gap-4">
                             <Button size="lg" asChild className="bg-green-500 hover:bg-green-600 text-white">
                                <Link href="https://wa.me/524491425323?text=Hola%2C%20quisiera%20agendar%20una%20cita." target="_blank" rel="noopener noreferrer">Agendar por WhatsApp</Link>
                            </Button>
                        </div>
                    </AnimatedDiv>
                    <AnimatedDiv>
                        <div className="aspect-video rounded-lg overflow-hidden border shadow-lg">
                             <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3702.570339299484!2d-102.3021980247293!3d21.8741344584067!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8681fe76822c9a91%3A0x8313459c53644f15!2sAv.%20de%20la%20Convenci%C3%B3n%20de%201914%20Sur%201421%2C%20Jardines%20de%20la%20Concepci%C3%B3n%20I%2C%2020267%20Aguascalientes%2C%20Ags.!5e0!3m2!1ses-419!2smx!4v1721855619840!5m2!1ses-419!2smx" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                        </div>
                    </AnimatedDiv>
                </div>
            </div>
        </section>
    );
}

export default LocationSection;
