"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

/**
 * FinalCta – Barra flotante de CTA.
 * BUG ANTERIOR: useTransform([0, 0.2] → [100, 0]) hacía que la barra
 * estuviera completamente oculta (y: 100 = fuera del viewport) al cargar
 * la página. El usuario debía scrollear el 20% de la página para verla.
 *
 * FIX: La barra aparece visible desde el inicio. Se oculta solo cuando
 * el usuario scrollea casi al tope (< 5%) — es decir, cuando ya está
 * en la sección Hero y el header cubre la barra. Se muestra para todo
 * el resto del scroll.
 */
function FinalCta() {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollY } = useScroll();

  // Mostramos el bar después de que el usuario baje 150px (pasó el hero)
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsVisible(latest > 150);
  });

  return (
    <motion.section
      initial={{ y: 120, opacity: 0 }}
      animate={isVisible ? { y: 0, opacity: 1 } : { y: 120, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl print:hidden pointer-events-none"
    >
      <div className="pointer-events-auto bg-black/80 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-full p-2 pl-6 md:pl-8 flex items-center justify-between gap-4 relative overflow-hidden">
        {/* Subtle highlight gradient inside banner */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />

        <div className="hidden sm:flex items-center gap-4 w-full relative z-10">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
          </span>
          <p className="font-light text-white text-base tracking-wide">
            Agendas hoy, <strong className="text-white font-extrabold ml-1">manejas mejor mañana.</strong>
          </p>
        </div>

        <Button
          size="lg"
          asChild
          className="w-full sm:w-auto rounded-full bg-primary hover:bg-primary/80 border border-primary/50 text-white font-bold h-14 px-8 shadow-lg transition-all hover:scale-105 active:scale-95 group relative z-10"
        >
          <Link href="https://wa.me/524491425323?text=Hola%2C%20quisiera%20agendar%20una%20cita." target="_blank" rel="noopener noreferrer">
            <Icon icon="logos:whatsapp-icon" className="mr-3 w-6 h-6 group-hover:scale-110 transition-transform"/>
            <span className="text-white text-base drop-shadow-sm">Agendar Ahora</span>
          </Link>
        </Button>
      </div>
    </motion.section>
  );
}

export default FinalCta;
