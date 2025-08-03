
"use client";

import React from 'react';
import Link from 'next/link';
import Image from "next/image";
import { Button } from '@/components/ui/button';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { cn } from '@/lib/utils';
import { HeroSection } from './(public)/landing/HeroSection';
import { AiFeaturesSection } from './(public)/landing/AiFeaturesSection';
import { CoreFeaturesSection } from './(public)/landing/CoreFeaturesSection';
import { BenefitsSection } from './(public)/landing/BenefitsSection';
import { WhyRanoroSection } from './(public)/landing/WhyRanoroSection';
import { PricingSection } from './(public)/landing/PricingSection';
import { TestimonialsSection } from './(public)/landing/TestimonialsSection';
import { GetStartedSection } from './(public)/landing/GetStartedSection';
import { FaqSection } from './(public)/landing/FaqSection';
import { CtaSection } from './(public)/landing/CtaSection';
import { Footer } from './(public)/landing/Footer';


export default function LandingPage() {

  return (
    <div className="bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <Link href="/" className="relative w-[140px] h-[40px]">
            <Image
              src="/ranoro-logo.png"
              alt="Ranoro Logo"
              fill
              style={{objectFit: 'contain'}}
              className="dark:invert"
              sizes="140px"
              data-ai-hint="ranoro logo"
              priority
            />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Button variant="ghost" asChild><Link href="#features">Funciones</Link></Button>
            <Button variant="ghost" asChild><Link href="#benefits">Beneficios</Link></Button>
            <Button variant="ghost" asChild><Link href="#why-ranoro">Por qué Ranoro</Link></Button>
            <Button variant="ghost" asChild><Link href="#pricing">Precios</Link></Button>
            <Button variant="ghost" asChild><Link href="#testimonials">Testimonios</Link></Button>
            <Button variant="ghost" asChild><Link href="#faq">FAQ</Link></Button>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild>
                <Link href="/login">Registrarte / Iniciar Sesión</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <HeroSection />

        <section className="py-12 bg-white">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <p className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Con la confianza de los mejores talleres de LATAM
                </p>
            </div>
        </section>

        <AiFeaturesSection />
        <CoreFeaturesSection />
        <BenefitsSection />
        <WhyRanoroSection />
        <PricingSection />
        <TestimonialsSection />
        <GetStartedSection />
        <FaqSection />
        <CtaSection />
      </main>

      <Footer />
    </div>
  );
}
