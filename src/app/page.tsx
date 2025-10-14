"use client";

import React from 'react';
import { Header } from './(public)/landing/Header';
import { HeroSection } from './(public)/landing/HeroSection';
import { PromotionsSection } from './(public)/landing/PromotionsSection';
import { WhyRanoroSection } from './(public)/landing/WhyRanoroSection';
import { TestimonialsSection } from './(public)/landing/TestimonialsSection';
import LocationSection from './(public)/landing/LocationSection';
import FinalCta from './(public)/landing/FinalCta';
import ServicesSection from './(public)/landing/ServicesSection';
import { Footer } from './(public)/landing/Footer';


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
