// src/app/(public)/landing/page.tsx
"use client";

import React from 'react';
import { Header } from './Header';
import { HeroSection } from './HeroSection';
import { PromotionsSection } from './PromotionsSection';
import { WhyRanoroSection } from './WhyRanoroSection';
import { TestimonialsSection } from './TestimonialsSection';
import LocationSection from './LocationSection';
import FinalCta from './FinalCta';
import ServicesSection from './ServicesSection';
import { Footer } from './Footer';

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
