
"use client";

import React from 'react';
import { HeroSection } from './(public)/landing/HeroSection';
import { WhyRanoroSection } from './(public)/landing/WhyRanoroSection';
import BeforeAfterSection from './(public)/landing/BeforeAfterSection';
import { TestimonialsSection } from './(public)/landing/TestimonialsSection';
import LocationSection from './(public)/landing/LocationSection';
import FinalCta from './(public)/landing/FinalCta';
import ServicesSection from './(public)/landing/ServicesSection';
import { Footer } from './(public)/landing/Footer';


export default function LandingPage() {

  return (
    <div className="bg-background text-foreground">
      <main>
        <HeroSection />
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
