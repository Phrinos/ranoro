"use client";
import React from 'react';
import Link from 'next/link';
import Image from "next/image";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedDiv } from './AnimatedDiv';
import { MessageSquare } from 'lucide-react';

const whatsappLink = "https://wa.me/524491425323?text=Hola%2C%20quisiera%20agendar%20una%20cita.";

export function HeroSection() {
    return (
        <section className="relative w-full h-[60vh] md:h-[70vh] flex items-center">
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
            <div className="absolute inset-0 bg-black/30"></div>
          </div>
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-end">
              <AnimatedDiv className="w-full max-w-md">
                <Card className="bg-black/70 backdrop-blur-sm border-white/20 text-white">
                  <CardContent className="p-8 text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-shadow">
                      Ranoro: Servicio Certificado
                    </h1>
                    <p className="mt-6 text-lg text-gray-200">
                      El mejor servicio en Aguascalientes, diagnostico claro y garantía en cada servicio.
                    </p>
                    <div className="mt-8">
                      <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-lg w-full">
                        <Link href={whatsappLink} target="_blank" rel="noopener noreferrer">
                          <MessageSquare className="mr-2 h-5 w-5"/> Agendar Cita
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
