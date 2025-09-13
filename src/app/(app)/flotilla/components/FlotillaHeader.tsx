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
    <div className="mb-6 flex flex-col sm:flex-row justify-end gap-2">
      <Button
        onClick={onAddCharge}
        variant="outline"
        className="w-full sm:w-auto bg-white border-red-500 text-black font-bold hover:bg-red-50"
      >
        <MinusCircle className="mr-2 h-4 w-4 text-red-500" />
        Generar Cargo
      </Button>
      <Button
        onClick={onAddPayment}
        variant="outline"
        className="w-full sm:w-auto bg-white border-green-500 text-black font-bold hover:bg-green-50"
      >
        <PlusCircle className="mr-2 h-4 w-4 text-green-700" />
        Registrar Pago
      </Button>
    </div>
  );
}
