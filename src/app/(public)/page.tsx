// src/app/(public)/page.tsx
"use client";

import React from 'react';
import { Header } from './landing/Header';
import { HeroSection } from './landing/HeroSection';
import { PromotionsSection } from './landing/PromotionsSection';
import { WhyRanoroSection } from './landing/WhyRanoroSection';
import { TestimonialsSection } from './landing/TestimonialsSection';
import LocationSection from './landing/LocationSection';
import FinalCta from './landing/FinalCta';
import ServicesSection from './landing/ServicesSection';
import BeforeAfterSection from './landing/BeforeAfterSection';
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
        <BeforeAfterSection />
        <TestimonialsSection />
        <LocationSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
