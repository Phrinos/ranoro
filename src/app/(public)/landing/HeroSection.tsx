"use client";
import React from 'react';
import Link from 'next/link';
import Image from "next/image";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedDiv } from './AnimatedDiv';

const whatsappLink = "https://wa.me/524491425323?text=Hola%2C%20quisiera%20agendar%20una%20cita.";

export function HeroSection() {
    return (
        <section className="relative w-full min-h-screen flex items-center justify-center md:justify-start">
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
          </div>
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center md:justify-start">
              <AnimatedDiv className="w-full max-w-md">
                <Card className="bg-black/70 backdrop-blur-sm border-white/20 text-white">
                  <CardContent className="p-6">
                    <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-shadow">
                      Servicio Profesional Certificado
                    </h1>
                    <p className="mt-4 text-base text-gray-200">
                      El mejor servicio en Aguascalientes, donde te ofrecemos excelentes precios con un diagnostico claro y nuestra garantía Ranoro en cada servicio hasta 60 dias o 1000km.
                    </p>
                    <div className="mt-6 space-y-3">
                       <Button size="lg" asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg w-full">
                        <Link href="/cotizar">
                          Cotizar mi Vehículo
                        </Link>
                      </Button>
                      <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-lg w-full">
                        <Link href={whatsappLink} target="_blank" rel="noopener noreferrer">
                          Agendar Cita
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedDiv>
            </div>
          </div>
        </section>
    );
}
