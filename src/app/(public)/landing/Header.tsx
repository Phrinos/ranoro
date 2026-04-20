// src/app/(public)/landing/Header.tsx
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { ContactModal } from './ContactModal';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { cn } from '@/lib/utils';

export function Header() {
  const [isContactModalOpen, setContactModalOpen] = useState(false);
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 50) setScrolled(true);
    else setScrolled(false);
  });

  return (
    <>
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "fixed top-0 z-50 w-full transition-all duration-300 print:hidden",
          scrolled ? "py-3" : "py-5"
        )}
      >
        <div className={cn(
          "mx-auto flex items-center justify-between px-5 transition-all duration-500",
          scrolled 
            ? "container max-w-6xl rounded-full bg-white text-slate-950 shadow-xl h-16" 
            : "container max-w-7xl rounded-4xl bg-black/40 backdrop-blur-md border border-white/10 shadow-lg h-20 text-white"
        )}>
          <Link href="/" className="relative w-[130px] h-[38px] shrink-0 transition-transform hover:scale-105">
            <Image
              src="/ranoro-logo.png"
              alt="Ranoro Logo"
              fill
              style={{ objectFit: 'contain' }}
              sizes="130px"
              priority
              data-ai-hint="ranoro logo"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2 text-sm font-bold">
            <Button variant="ghost" className={cn("rounded-full transition-colors", scrolled ? "hover:bg-slate-100" : "hover:bg-white/20")} asChild><Link href="#services">Servicios</Link></Button>
            <Button variant="ghost" className={cn("rounded-full transition-colors", scrolled ? "hover:bg-slate-100" : "hover:bg-white/20")} asChild><Link href="#why-ranoro">¿Por qué Ranoro?</Link></Button>
            <Button variant="ghost" className={cn("rounded-full transition-colors", scrolled ? "hover:bg-slate-100" : "hover:bg-white/20")} asChild><Link href="#testimonials">Testimonios</Link></Button>
            <Button variant="ghost" className={cn("rounded-full transition-colors", scrolled ? "hover:bg-slate-100" : "hover:bg-white/20")} asChild><Link href="/facturar">Facturación</Link></Button>
          </nav>

          <div className="flex items-center gap-3">
             <Button 
                onClick={() => setContactModalOpen(true)} 
                variant={scrolled ? "default" : "secondary"}
                className={cn("hidden sm:inline-flex rounded-full transition-all hover:scale-105 shadow-xs font-bold", !scrolled && "bg-white/10 text-white hover:bg-white/20 border-white/20 border backdrop-blur-md")}
             >
                Contáctanos
             </Button>
            <Button 
                asChild
                variant={scrolled ? "outline-solid" : "default"}
                className={cn("rounded-full transition-all hover:scale-105 shadow-xs font-bold", !scrolled && "bg-white text-slate-900 hover:bg-white/90")}
            >
                <Link href="/login">Ingresar</Link>
            </Button>

            {/* Mobile Navigation Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className={cn("md:hidden rounded-full", scrolled ? "bg-white border-slate-200" : "bg-white/10 text-white border-white/20 backdrop-blur-md")}>
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] border-r border-border/50 bg-background/95 backdrop-blur-xl">
                <div className="p-6">
                  <Link href="/" className="relative w-[140px] h-[40px] mb-8 block">
                    <Image src="/ranoro-logo.png" alt="Ranoro Logo" fill style={{ objectFit: 'contain' }} sizes="140px"/>
                  </Link>
                  <nav className="flex flex-col gap-2">
                    <SheetClose asChild><Link href="#services" className="text-lg py-3 font-medium hover:text-primary transition-colors">Servicios</Link></SheetClose>
                    <SheetClose asChild><Link href="#why-ranoro" className="text-lg py-3 font-medium hover:text-primary transition-colors">¿Por qué Ranoro?</Link></SheetClose>
                    <SheetClose asChild><Link href="#testimonials" className="text-lg py-3 font-medium hover:text-primary transition-colors">Testimonios</Link></SheetClose>
                    <SheetClose asChild><Link href="/facturar" className="text-lg py-3 font-medium hover:text-primary transition-colors">Facturación</Link></SheetClose>
                     <div className="mt-6 pt-6 border-t border-border/50">
                        <SheetClose asChild>
                           <Button onClick={() => setContactModalOpen(true)} className="w-full rounded-full h-12 text-lg">Contáctanos</Button>
                        </SheetClose>
                     </div>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.header>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setContactModalOpen(false)} />
    </>
  );
}
