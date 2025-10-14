"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { ContactModal } from './ContactModal';

export function Header() {
  const [isContactModalOpen, setContactModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm print:hidden">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="relative w-[140px] h-[40px] flex-shrink-0">
            <Image
              src="/ranoro-logo.png"
              alt="Ranoro Logo"
              fill
              style={{ objectFit: 'contain' }}
              sizes="140px"
              priority
              data-ai-hint="ranoro logo"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Button variant="ghost" asChild><Link href="#services">Servicios</Link></Button>
            <Button variant="ghost" asChild><Link href="#why-ranoro">¿Por qué Ranoro?</Link></Button>
            <Button variant="ghost" asChild><Link href="#testimonials">Testimonios</Link></Button>
            <Button variant="ghost" asChild><Link href="/facturar">Facturación</Link></Button>
          </nav>

          <div className="flex items-center gap-2">
             <Button onClick={() => setContactModalOpen(true)} className="hidden sm:inline-flex">Contáctanos</Button>
            <Button asChild><Link href="/login">Iniciar Sesión</Link></Button>

            {/* Mobile Navigation Trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px]">
                <div className="p-6">
                  <Link href="/" className="relative w-[140px] h-[40px] mb-6 block">
                    <Image src="/ranoro-logo.png" alt="Ranoro Logo" fill style={{ objectFit: 'contain' }} sizes="140px"/>
                  </Link>
                  <nav className="flex flex-col gap-3">
                    <SheetClose asChild><Link href="#services" className="text-lg py-2">Servicios</Link></SheetClose>
                    <SheetClose asChild><Link href="#why-ranoro" className="text-lg py-2">¿Por qué Ranoro?</Link></SheetClose>
                    <SheetClose asChild><Link href="#testimonials" className="text-lg py-2">Testimonios</Link></SheetClose>
                    <SheetClose asChild><Link href="/facturar" className="text-lg py-2">Facturación</Link></SheetClose>
                     <SheetClose asChild>
                        <Button onClick={() => setContactModalOpen(true)} className="mt-4">Contáctanos</Button>
                     </SheetClose>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <ContactModal isOpen={isContactModalOpen} onClose={() => setContactModalOpen(false)} />
    </>
  );
}
