"use client";
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { Icon } from '@iconify/react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const gmapsUrl = "https://www.google.com/maps/place/Servicio+Profesional+Ranoro+Taller/@21.8741345,-102.302198,17z/data=!3m1!4b1!4m6!3m5!1s0x8681fe76822c9a91:0x8313459c53644f15!8m2!3d21.8741295!4d-102.2996231!16s%2Fg%2F11b_2w_x5t?entry=ttu";
const whatsappUrl = "https://wa.me/524491425323?text=Hola%2C%20quisiera%20agendar%20una%20cita.";

export function ContactModal({ isOpen, onClose }: ContactModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
            <Link href="/" className="relative w-[140px] h-[40px] mb-4">
                <Image
                    src="/ranoro-logo.png"
                    alt="Ranoro Logo"
                    fill
                    style={{ objectFit: 'contain' }}
                    sizes="140px"
                    data-ai-hint="ranoro logo"
                />
            </Link>
          <DialogTitle>Contáctanos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="text-center">
                <p className="text-sm text-muted-foreground">Dirección</p>
                <p>Av. de la Convencion de 1914 Sur #1421, Jardines de la Convencion, 20267, Aguascalientes, Aguascalientes.</p>
            </div>
             <div className="text-center">
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p>449 142 5323</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
                 <Button asChild className="w-full bg-green-500 hover:bg-green-600 text-white">
                    <Link href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        <Icon icon="logos:whatsapp-icon" className="h-5 w-5 mr-2"/>
                        Enviar WhatsApp
                    </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                    <Link href={gmapsUrl} target="_blank" rel="noopener noreferrer">
                         <Icon icon="logos:google-maps" className="h-5 w-5 mr-2"/>
                        Ver en Google Maps
                    </Link>
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
