
// src/app/(app)/servicios/components/PhotoReportModal.tsx
"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import PhotoReportTab from './PhotoReportTab'; // Reutilizamos el componente existente
import { ScrollArea } from '@/components/ui/scroll-area';

interface PhotoReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoReportModal({ open, onOpenChange }: PhotoReportModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-full flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Reporte Fotográfico</DialogTitle>
          <DialogDescription>
            Añade, describe y elimina fotos del servicio.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow">
            <div className="p-4">
                <PhotoReportTab />
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
