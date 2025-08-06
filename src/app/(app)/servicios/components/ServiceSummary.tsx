
// src/app/(app)/servicios/components/ServiceSummary.tsx
"use client";

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useServiceTotals } from '@/hooks/use-service-form-hooks';
import { PaymentSection } from './PaymentSection';
import { ServiceFormValues } from '@/schemas/service-form';

export function ServiceSummary() {
  const form = useFormContext<ServiceFormValues>();
  const { totalCost, totalSuppliesWorkshopCost, serviceProfit } = useServiceTotals(form);
  
  const IVA_RATE = 0.16;
  const subTotal = totalCost / (1 + IVA_RATE);
  const tax = totalCost - subTotal;

  return (
    <div className="space-y-6">
      <PaymentSection />
      <Card>
        <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{formatCurrency(subTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA (16%):</span>
                <span className="font-medium">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>TOTAL:</span>
                <span className="text-primary">{formatCurrency(totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">Costo Insumos (Taller):</span>
                <span className="font-medium">{formatCurrency(totalSuppliesWorkshopCost)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-green-600">
                <span>Ganancia Bruta:</span>
                <span>{formatCurrency(serviceProfit)}</span>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
