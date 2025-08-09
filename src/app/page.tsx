
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from "next/image";
import { Button } from '@/components/ui/button';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { cn } from '@/lib/utils';
import { HeroSection } from './(public)/landing/HeroSection';
import { LatamWorkshops } from './(public)/landing/LatamWorkshops';
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';


export default function LandingPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "#features", label: "Funciones" },
    { href: "#benefits", label: "Beneficios" },
    { href: "#why-ranoro", label: "Por qué Ranoro" },
    { href: "#pricing", label: "Precios" },
    { href: "#testimonials", label: "Testimonios" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <div className="bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <Link href="/" className="relative w-[140px] h-[40px] flex-shrink-0">
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
          <nav className="hidden items-center gap-1 lg:flex">
             {navLinks.map(link => (
                <Button key={link.href} variant="ghost" asChild>
                    <Link href={link.href}>{link.label}</Link>
                </Button>
            ))}
          </nav>
          <div className="hidden lg:flex items-center gap-2">
            <Button asChild>
                <Link href="/login">Registrarte / Iniciar Sesión</Link>
            </Button>
          </div>
          <div className="lg:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-3/4">
                <nav className="flex flex-col items-center justify-center h-full gap-6">
                  {navLinks.map(link => (
                      <Link key={link.href} href={link.href} className="text-xl font-medium" onClick={() => setIsMobileMenuOpen(false)}>
                          {link.label}
                      </Link>
                  ))}
                  <Button asChild size="lg" className="mt-8" onClick={() => setIsMobileMenuOpen(false)}>
                    <Link href="/login">Iniciar Sesión</Link>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>
        <HeroSection />

        <LatamWorkshops />

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
