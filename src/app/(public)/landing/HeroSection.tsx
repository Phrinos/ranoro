
"use client";
import React from 'react';
import Link from 'next/link';
import Image from "next/image";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnimatedDiv } from './AnimatedDiv';

export function HeroSection() {
    return (
        <section className="relative w-full h-[80vh] flex items-center justify-start text-left text-white overflow-hidden">
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
            <div className="absolute inset-0 bg-black/60 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
          </div>
          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedDiv><Badge variant="secondary" className="mb-4 bg-white/10 text-white border-white/20 px-4 py-2 text-sm sm:text-base">La evolución de la gestión automotriz</Badge></AnimatedDiv>
            <AnimatedDiv><h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-shadow">
              El sistema operativo <span className="text-primary">inteligente</span><br/> para tu taller mecánico.
            </h1></AnimatedDiv>
            <AnimatedDiv><p className="mt-6 max-w-xl text-lg text-gray-200 text-shadow">
              Desde la recepción hasta la facturación, Ranoro centraliza tus operaciones y usa IA para que tomes decisiones más rentables.
            </p></AnimatedDiv>
            <AnimatedDiv><div className="mt-8 flex flex-col sm:flex-row justify-start items-start gap-4">
              <Button size="lg" asChild>
                <Link href="/login">Pruébalo gratis por 14 días</Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20" asChild>
                  <Link href="#features">Descubre las funciones</Link>
              </Button>
            </div></AnimatedDiv>
          </div>
        </section>
    );
}
