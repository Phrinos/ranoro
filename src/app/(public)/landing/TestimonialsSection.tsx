// src/app/(public)/landing/TestimonialsSection.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedDiv } from './AnimatedDiv';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';

const testimonials = [
    { quote: "Precio justo y me explicaron todo el proceso. Muy transparentes.", author: "Carlos M.", rating: 5 },
    { quote: "La pintura de mi puerta quedó como nueva, igualaron el color perfectamente.", author: "Laura R.", rating: 5 },
    { quote: "Después de la afinación, mi auto gasta menos gasolina. Excelente servicio.", author: "Ernesto P.", rating: 5 },
    { quote: "Llevé mi carro por un ruido en la suspensión y lo arreglaron el mismo día. ¡Impresionante!", author: "Sofía G.", rating: 5 },
    { quote: "El diagnóstico computarizado fue rápido y preciso. Me ahorraron mucho dinero.", author: "Javier T.", rating: 4 },
    { quote: "Tenía un golpe fuerte en la salpicadera y el trabajo de hojalatería fue impecable.", author: "Mariana V.", rating: 5 },
    { quote: "Siempre amables y profesionales. Me mantienen informado con fotos por WhatsApp.", author: "Ricardo J.", rating: 5 },
    { quote: "La garantía que ofrecen me dio mucha confianza. Se nota que respaldan su trabajo.", author: "Ana L.", rating: 5 },
    { quote: "Repararon el plástico de mi fascia y quedó increíble. No tuve que comprar una nueva.", author: "David S.", rating: 5 },
    { quote: "El mejor servicio de frenos que he recibido. Mi coche frena como nuevo.", author: "Verónica C.", rating: 5 },
    { quote: "Me ayudaron con un problema eléctrico que otros dos talleres no pudieron resolver.", author: "Fernando A.", rating: 5 },
    { quote: "Excelente relación calidad-precio. Sientes que tu dinero rinde.", author: "Paola I.", rating: 5 },
];

const TestimonialCard = ({ quote, author, rating }: { quote: string; author: string; rating: number }) => (
  <Card className="w-[340px] md:w-[420px] shrink-0 mx-4 bg-white/50 backdrop-blur-xl border-slate-200/50 shadow-sm rounded-3xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-8">
          <div className="flex gap-1 text-amber-400 mb-6 drop-shadow-sm">
              {Array.from({ length: 5 }, (_, i) => (
                  <Icon key={i} icon={i < rating ? "solar:star-bold" : "solar:star-linear"} className="h-6 w-6"/>
              ))}
          </div>
          <blockquote className="text-xl md:text-2xl font-light text-slate-700 mb-6 leading-relaxed">"{quote}"</blockquote>
          <div className="flex items-center mt-auto">
             <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/50 flex items-center justify-center text-primary font-bold mr-3 border border-primary/20">
               {author.charAt(0)}
             </div>
             <p className="font-semibold text-slate-900">{author}</p>
          </div>
      </CardContent>
  </Card>
);

/**
 * Infinite marquee row usando CSS animations.
 * Duplicamos los items 1 vez (2 total) y animamos translateX(-50%)
 * para un loop perfecto sin flash ni valores hardcoded en píxeles.
 */
const MarqueeRow = ({
  items,
  direction = "left",
  speed = 60,
}: {
  items: typeof testimonials;
  direction?: "left" | "right";
  speed?: number;
}) => {
  const duplicated = [...items, ...items];
  const animClass = direction === "left" ? "animate-marquee-left" : "animate-marquee-right";

  return (
    <div className="relative flex overflow-hidden w-full">
      {/* fade masks */}
      <div className="absolute left-0 top-0 bottom-0 w-32 z-10 pointer-events-none bg-gradient-to-r from-slate-50 to-transparent" />
      <div className="absolute right-0 top-0 bottom-0 w-32 z-10 pointer-events-none bg-gradient-to-l from-slate-50 to-transparent" />

      <div
        className={`flex items-center will-change-transform ${animClass}`}
        style={{ "--marquee-speed": `${speed}s` } as React.CSSProperties}
      >
        {duplicated.map((t, idx) => (
          <TestimonialCard key={idx} {...t} />
        ))}
      </div>
    </div>
  );
};

export function TestimonialsSection() {
    const row1 = testimonials.slice(0, 6);
    const row2 = testimonials.slice(6, 12);

    return (
        <section id="testimonials" className="py-24 md:py-32 bg-slate-50 overflow-hidden relative">
            <div className="container relative mx-auto px-4 sm:px-6 lg:px-8 z-20 mb-16">
                 <AnimatedDiv className="text-center max-w-4xl mx-auto">
                    <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm uppercase tracking-widest border-primary/30 text-primary bg-primary/5 rounded-full">Casos de Éxito</Badge>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
                      No lo decimos nosotros, <br/><span className="text-primary italic">lo dicen nuestros clientes.</span>
                    </h2>
                </AnimatedDiv>
            </div>

            <div className="relative z-0 flex flex-col gap-8">
                <MarqueeRow items={row1} direction="left" speed={55} />
                <MarqueeRow items={row2} direction="right" speed={70} />
            </div>

            <div className="container relative mx-auto px-4 mt-20 z-20">
                <AnimatedDiv className="text-center flex items-center justify-center gap-4 flex-col sm:flex-row">
                    <Button asChild size="lg" className="rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all px-8 h-14 bg-white text-slate-900 border border-slate-200 hover:bg-slate-50">
                        <Link href="https://share.google/oBweULXW1ADrwdoY8" target="_blank" rel="noopener noreferrer">
                            <Icon icon="logos:google-icon" className="mr-3 h-5 w-5"/>
                            <span className="font-semibold">Ver +200 reseñas en Google</span>
                        </Link>
                    </Button>
                </AnimatedDiv>
                
                <div className="mt-20 pt-10 border-t border-slate-200/60 flex flex-wrap justify-center items-center gap-4 md:gap-8">
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-extrabold text-slate-900">4.7</span>
                      <div className="flex text-amber-400 mt-1 mb-1">
                        <Icon icon="solar:star-bold" className="h-4 w-4"/>
                        <Icon icon="solar:star-bold" className="h-4 w-4"/>
                        <Icon icon="solar:star-bold" className="h-4 w-4"/>
                        <Icon icon="solar:star-bold" className="h-4 w-4"/>
                        <Icon icon="solar:star-half-bold" className="h-4 w-4"/>
                      </div>
                      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Estrellas</span>
                    </div>
                    <div className="w-px h-12 bg-slate-200 hidden sm:block"></div>
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-extrabold text-slate-900">7+</span>
                      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-2">Años de Exp.</span>
                    </div>
                    <div className="w-px h-12 bg-slate-200 hidden sm:block"></div>
                    <div className="flex flex-col items-center">
                      <span className="text-3xl font-extrabold text-primary">11k+</span>
                      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-2">Servicios</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
