// src/app/(app)/flotilla/components/FlotillaHeader.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, MinusCircle } from 'lucide-react';

interface FlotillaHeaderProps {
  onAddPayment: () => void;
  onAddCharge: () => void;
}

export function FlotillaHeader({ onAddPayment, onAddCharge }: FlotillaHeaderProps) {
  return (
    <div className="mb-6 flex justify-end gap-2">
      <Button
        onClick={onAddCharge}
        variant="outline"
        className="border-red-500/50 text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <MinusCircle className="mr-2 h-4 w-4" />
        Generar Cargo
      </Button>
      <Button
        onClick={onAddPayment}
        variant="outline"
        className="border-green-600/50 text-green-700 hover:bg-green-50 hover:text-green-800"
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Registrar Pago
      </Button>
    </div>
  );
}
