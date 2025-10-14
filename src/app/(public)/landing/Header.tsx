
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ContactModal } from './ContactModal';

export function Header() {
  const [isContactModalOpen, setContactModalOpen] = useState(false);

  const toggleContactModal = () => {
    setContactModalOpen(!isContactModalOpen);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background print:hidden">
      <div className="container mx-auto flex h-auto min-h-20 flex-wrap items-center justify-between gap-y-2 py-2 px-4 md:px-6">
        <Link href="/" className="relative w-[140px] h-[40px]">
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
        <div className="flex items-center gap-2 text-sm">
          <Button variant="ghost" asChild>
            <Link href="#services">Servicios</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/facturar">Facturación</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/cotizar">Cotizador de vehículos</Link>
          </Button>
          <Button onClick={toggleContactModal}>Contáctanos</Button>
          <Button asChild>
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
        </div>
      </div>
      <ContactModal isOpen={isContactModalOpen} onClose={toggleContactModal} />
    </header>
  );
}
