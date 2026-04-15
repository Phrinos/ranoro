// src/app/(public)/page.tsx
// Esta es la página raíz que sirve la ruta "/" (landing principal).
// landing/page.tsx sirve "/landing" - ambas deben ser idénticas.

"use client";

import React from 'react';
import { Header } from './landing/Header';
import { HeroSection } from './landing/HeroSection';
import { PromotionsSection } from './landing/PromotionsSection';
import { WhyRanoroSection } from './landing/WhyRanoroSection';
import ServicesSection from './landing/ServicesSection';
import { TestimonialsSection } from './landing/TestimonialsSection';
import LocationSection from './landing/LocationSection';
import FinalCta from './landing/FinalCta';
import { Footer } from './landing/Footer';

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground">
      <Header />
      <main>
        <HeroSection />
        <PromotionsSection />
        <WhyRanoroSection />
        <ServicesSection />
        <TestimonialsSection />
        <LocationSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
