// src/app/(app)/servicios/components/ServiceMobileBar.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Camera, ClipboardCheck, Save } from 'lucide-react';

interface ServiceMobileBarProps {
  onOpenServicesSheet: () => void;
  onTakePhoto: () => void;
  onStartChecklist: () => void;
  onSave: () => void;
  isSubmitting: boolean;
}

export function ServiceMobileBar({
  onOpenServicesSheet,
  onTakePhoto,
  onStartChecklist,
  onSave,
  isSubmitting,
}: ServiceMobileBarProps) {
  return (
    <footer className="sticky bottom-0 z-20 md:hidden w-full bg-background/95 border-t p-2 backdrop-blur-sm">
      <div className="grid grid-cols-4 gap-2">
        <Button variant="ghost" className="flex flex-col h-auto items-center" onClick={onOpenServicesSheet}>
          <Menu className="h-5 w-5" />
          <span className="text-xs mt-1">Activos</span>
        </Button>
        <Button variant="ghost" className="flex flex-col h-auto items-center" onClick={onTakePhoto}>
          <Camera className="h-5 w-5" />
          <span className="text-xs mt-1">Fotos</span>
        </Button>
        <Button variant="ghost" className="flex flex-col h-auto items-center" onClick={onStartChecklist}>
          <ClipboardCheck className="h-5 w-5" />
          <span className="text-xs mt-1">Checklist</span>
        </Button>
        <Button 
            type="button"
            onClick={onSave}
            variant="default" 
            className="flex flex-col h-auto items-center bg-green-600 hover:bg-green-700" 
            disabled={isSubmitting}
        >
          <Save className="h-5 w-5" />
          <span className="text-xs mt-1">Guardar</span>
        </Button>
      </div>
    </footer>
  );
}
