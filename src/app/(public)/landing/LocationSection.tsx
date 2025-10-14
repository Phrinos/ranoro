
"use client";
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AnimatedDiv } from './AnimatedDiv';
import { MapPin, Clock, CreditCard, Phone, MessageSquare } from 'lucide-react';

function LocationSection() {
    return (
        <section id="location" className="py-20 md:py-28 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <AnimatedDiv>
                        <h2 className="text-3xl font-extrabold">Visítanos o Contáctanos</h2>
                        <p className="mt-4 text-muted-foreground">Estamos listos para atenderte.</p>
                        <div className="mt-8 space-y-4 text-lg">
                            <div className="flex items-center gap-4"><MapPin className="h-6 w-6 text-primary"/><p>Sara Pérez de Madero 212, Fracc. Francisco I. Madero, Durango, Dgo.</p></div>
                            <div className="flex items-center gap-4"><Clock className="h-6 w-6 text-primary"/><p>Lunes a Sábado: 9:00 AM – 7:00 PM</p></div>
                            <div className="flex items-center gap-4"><CreditCard className="h-6 w-6 text-primary"/><p>Aceptamos: Efectivo, Tarjeta, Transferencia</p></div>
                        </div>
                        <div className="mt-8 flex gap-4">
                             <Button size="lg" asChild className="bg-green-500 hover:bg-green-600 text-white">
                                <Link href="https://wa.me/524493930914?text=Hola%2C%20quisiera%20agendar%20una%20cita." target="_blank" rel="noopener noreferrer"><MessageSquare className="mr-2 h-5 w-5"/> Agendar por WhatsApp</Link>
                            </Button>
                             <Button size="lg" variant="outline" asChild>
                                <Link href="tel:4493930914"><Phone className="mr-2 h-5 w-5"/> Llamar ahora</Link>
                            </Button>
                        </div>
                    </AnimatedDiv>
                    <AnimatedDiv>
                        <div className="aspect-video rounded-lg overflow-hidden border shadow-lg">
                             <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3644.072522987155!2d-104.64654588889816!3d24.02870197838507!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x869bb7c24a9388c5%3A0x1333423f1b4c2b9a!2sC.%20Sara%20P%C3%A9rez%20de%20Madero%20212%2C%20Francisco%20I.%20Madero%2C%2034159%20Durango%2C%20Dgo.!5e0!3m2!1ses-419!2smx!4v1721340156947!5m2!1ses-419!2smx" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe>
                        </div>
                    </AnimatedDiv>
                </div>
            </div>
        </section>
    );
}

export default LocationSection;
