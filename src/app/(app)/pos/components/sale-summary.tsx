

"use client";

import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Receipt, Save, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const IVA_RATE = 0.16;

export function SaleSummary() {
  const { watch, formState } = useFormContext();
  const watchedItems = watch("items");

  const [subTotal, setSubTotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const newTotalAmount = watchedItems?.reduce((sum: number, item: any) => sum + item.totalPrice || 0, 0) || 0;
    const newSubTotal = newTotalAmount / (1 + IVA_RATE);
    const newTax = newTotalAmount - newSubTotal;
    
    setSubTotal(newSubTotal);
    setTax(newTax);
    setTotal(newTotalAmount);
  }, [watchedItems]);
  
  const hasItems = watchedItems && watchedItems.length > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Resumen de Venta</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col space-y-2 flex-grow justify-between">
        <div className="w-full">
          <div className="text-lg w-full flex justify-between"><span>Subtotal:</span> <span className="font-semibold">{formatCurrency(subTotal)}</span></div>
          <div className="text-sm text-muted-foreground w-full flex justify-between"><span>IVA ({(IVA_RATE * 100).toFixed(0)}%):</span> <span className="font-semibold">{formatCurrency(tax)}</span></div>
        </div>
        <div className="w-full space-y-4">
           <div className="text-2xl font-bold w-full flex justify-between pt-2 border-t"><span>Total:</span> <span className="text-primary">{formatCurrency(total)}</span></div>
            <Button
                type="submit"
                form="pos-form"
                disabled={formState.isSubmitting || !hasItems}
                className="w-full h-12 text-lg"
            >
                {formState.isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                    <Save className="mr-2 h-5 w-5" />
                )}
                Completar Venta ({formatCurrency(total)})
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
