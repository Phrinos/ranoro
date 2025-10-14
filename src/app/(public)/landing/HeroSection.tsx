
"use client";
import React from 'react';
import Link from 'next/link';
import Image from "next/image";
import { Button } from '@/components/ui/button';
import { AnimatedDiv } from './AnimatedDiv';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Phone, MessageSquare } from 'lucide-react';

const whatsappLink = "https://wa.me/524493930914?text=Hola%2C%20quisiera%20agendar%20una%20cita.";
const phoneLink = "tel:4493930914";

export function HeroSection() {
    return (
        <section className="relative w-full bg-gray-900 text-white pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="absolute inset-0 z-0">
            <Image
              src="/home.png"
              alt="Taller mecánico moderno con un coche deportivo"
              fill
              className="object-cover object-center"
              sizes="100vw"
              data-ai-hint="mechanic workshop"
              priority
            />
            <div className="absolute inset-0 bg-black/70 bg-gradient-to-t from-black/80 via-black/50 to-transparent"></div>
          </div>
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <AnimatedDiv>
                  <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-shadow">
                    Ranoro Taller – Mecánica, Hojalatería y Pintura en Aguascalientes
                  </h1>
                </AnimatedDiv>
                <AnimatedDiv>
                  <p className="mt-6 max-w-xl text-lg text-gray-200 text-shadow">
                    Mantenimientos claros, trabajo garantizado y trato honesto. Agenda por WhatsApp.
                  </p>
                </AnimatedDiv>
                <AnimatedDiv>
                  <div className="mt-8 flex flex-col sm:flex-row items-start gap-4">
                    <Button size="lg" asChild className="bg-green-500 hover:bg-green-600 text-white">
                      <Link href={whatsappLink} target="_blank" rel="noopener noreferrer">
                        <MessageSquare className="mr-2 h-5 w-5"/> Agendar por WhatsApp
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20" asChild>
                      <Link href={phoneLink}>
                        <Phone className="mr-2 h-5 w-5"/> Llamar ahora
                      </Link>
                    </Button>
                  </div>
                </AnimatedDiv>
              </div>

              <div className="space-y-6">
                <AnimatedDiv>
                  <Card className="bg-card/80 backdrop-blur-sm border-primary/50 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl text-primary">Cambio de aceite $799</CardTitle>
                      <CardDescription className="text-white/90">
                        Incluye hasta 4L de aceite 5W-30 semisintético, filtro estándar y revisión de 15 puntos.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs text-white/70">
                      <p>Aplica a: 4 cilindros aspirados (sedanes/hatchback).</p>
                      <p>Extras: aceite sintético, litros adicionales o filtros premium tienen costo adicional.</p>
                       <Button size="sm" variant="link" className="p-0 h-auto mt-2 text-primary" asChild>
                        <Link href="/promo/cambio-de-aceite">Ver detalles de la promoción</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </AnimatedDiv>
                <AnimatedDiv>
                  <Card className="bg-card/80 backdrop-blur-sm border-primary/50 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl text-primary">Afinación integral $1,999</CardTitle>
                      <CardDescription className="text-white/90">
                        Cambio de bujías, limpieza de cuerpo de aceleración, lavado de inyectores, filtro de aire y escaneo.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-xs text-white/70">
                      <p>No incluye: bujías iridium/platino, filtro de combustible externo, bobinas/sensores. Turbo o V6/V8 requiere cotización.</p>
                       <Button size="sm" variant="link" className="p-0 h-auto mt-2 text-primary" asChild>
                        <Link href="/promo/afinacion-integral">Ver detalles de la promoción</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </AnimatedDiv>
              </div>
            </div>
          </div>
        </section>
    );
}
