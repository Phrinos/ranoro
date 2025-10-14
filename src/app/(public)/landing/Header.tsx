"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from '@iconify/react';

const mecanicaServices = [
  "Afinación Integral",
  "Cambio de Aceite",
  "Diagnóstico",
  "Diagnóstico por Computadora",
  "Frenos",
  "Suspensiones",
].sort((a, b) => a.localeCompare(b));

const hojalateriaServices = [
  "Hojalatería",
  "Pintura",
  "Reparación de Plásticos",
].sort((a, b) => a.localeCompare(b));

export function Header() {
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost">
                Servicios <Icon icon="twemoji:down-arrow" className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Icon icon="twemoji:wrench" className="h-4 w-4" />
                Mecánica
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {mecanicaServices.map(service => (
                <DropdownMenuItem key={service} asChild>
                  <Link href="#services">{service}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2">
                <Icon icon="twemoji:automobile" className="h-4 w-4" />
                Hojalatería y Pintura
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {hojalateriaServices.map(service => (
                <DropdownMenuItem key={service} asChild>
                  <Link href="#services">{service}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild>
            <Link href="/login">Iniciar Sesión</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
