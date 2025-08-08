// src/app/(app)/servicios/components/ServiceSummary.tsx
"use client";

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useServiceTotals } from '@/hooks/use-service-form-hooks';
import { PaymentSection } from '@/components/shared/PaymentSection';

interface ServiceSummaryProps {
  onOpenValidateDialog: (index: number) => void;
  validatedFolios: Record<number, boolean>;
}

const IVA_RATE = 0.16;

export function ServiceSummary({ onOpenValidateDialog, validatedFolios }: ServiceSummaryProps) {
  const form = useFormContext();
  const { totalCost, subTotal, taxAmount } = useServiceTotals(form);
  
  const totalPaid = (form.watch('payments') || []).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0) || 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Resumen y Pago</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col space-y-4 flex-grow">
        <PaymentSection onOpenValidateDialog={onOpenValidateDialog} validatedFolios={validatedFolios} />
        
        <div className="w-full mt-auto space-y-2 text-sm border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-medium">{formatCurrency(subTotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">IVA ({(IVA_RATE * 100).toFixed(0)}%):</span>
            <span className="font-medium">{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-lg font-bold pt-1 mt-1 border-t border-gray-300">
            <span>Total:</span>
            <span className="text-primary">{formatCurrency(totalCost)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
