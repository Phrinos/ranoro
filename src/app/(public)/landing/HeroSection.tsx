// src/app/(public)/landing/HeroSection.tsx
"use client";
import React from 'react';
import Link from 'next/link';
import Image from "next/image";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StaggerContainer, StaggerItem, AnimatedDiv } from './AnimatedDiv';
import { ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const whatsappLink = "https://wa.me/524491425323?text=Hola%2C%20quisiera%20agendar%20una%20cita.";

export function HeroSection() {
  return (
    <section className="relative w-full min-h-svh flex items-center justify-center md:justify-start overflow-hidden">
      <motion.div
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.4, ease: "easeOut" }}
        className="absolute inset-0 z-0"
      >
        <Image
          src="/home.png"
          alt="Taller mecánico moderno con un coche deportivo"
          fill
          className="object-cover object-top"
          sizes="100vw"
          data-ai-hint="mechanic workshop"
          priority
        />
        {/* Premium elegant gradient for left side text contrast focusing only on the left text area */}
        <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/40 to-transparent z-10 pointer-events-none"></div>
      </motion.div>

      <div className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-24">
        <div className="flex justify-center md:justify-start">
          <StaggerContainer className="w-full max-w-xl" staggerDelay={0.15}>
            <Card className="bg-black/30 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden rounded-4xl text-white">
              {/* Subtle inner glow */}
              <div className="absolute inset-0 bg-linear-to-b from-white/10 to-transparent pointer-events-none"></div>

              <CardContent className="p-8 sm:p-10 relative z-10">
                <StaggerItem>
                  <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur-md mb-6">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                    Abiertos hoy
                  </div>
                </StaggerItem>

                <StaggerItem>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-white via-gray-200 to-gray-400">
                    Servicio Profesional<br />Certificado
                  </h1>
                </StaggerItem>

                <StaggerItem>
                  <p className="mt-5 text-lg md:text-xl text-gray-300 leading-relaxed font-light">
                    El mejor servicio automotriz en Aguascalientes con un diagnóstico claro y nuestra <strong className="text-white font-semibold">Garantía Ranoro</strong> de 60 días o 1000km.
                  </p>
                </StaggerItem>

                <StaggerItem>
                  <div className="mt-8 flex flex-col sm:flex-row gap-4">
                    <Button size="lg" asChild className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg w-full sm:w-auto px-8 h-14 transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(var(--primary),0.4)]">
                      <Link href={whatsappLink} target="_blank" rel="noopener noreferrer">
                        Agendar Cita
                      </Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white text-lg w-full sm:w-auto px-8 h-14 backdrop-blur-md transition-all hover:scale-105">
                      <Link href="#promotions" className="group">
                        Ver Promociones
                        <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </StaggerItem>
              </CardContent>
            </Card>
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}
