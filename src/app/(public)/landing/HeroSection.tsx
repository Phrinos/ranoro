"use client";
import React from 'react';
import Link from 'next/link';
import Image from "next/image";
import { Button } from '@/components/ui/button';
import { AnimatedDiv } from './AnimatedDiv';
import { Phone, MessageSquare } from 'lucide-react';

const whatsappLink = "https://wa.me/524491425323?text=Hola%2C%20quisiera%20agendar%20una%20cita.";
const phoneLink = "tel:4491425323";

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
            <div className="max-w-3xl text-center mx-auto">
                <AnimatedDiv>
                  <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-shadow">
                    Ranoro Taller – Mecánica, Hojalatería y Pintura en Aguascalientes
                  </h1>
                </AnimatedDiv>
                <AnimatedDiv>
                  <p className="mt-6 max-w-xl mx-auto text-lg text-gray-200 text-shadow">
                    Mantenimientos claros, trabajo garantizado y trato honesto. Agenda por WhatsApp.
                  </p>
                </AnimatedDiv>
                <AnimatedDiv>
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
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
          </div>
        </section>
    );
}
