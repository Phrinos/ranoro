// src/app/(app)/pos/components/sale-summary.tsx

"use client";

import React, { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Loader2 } from 'lucide-react';
import { formatCurrency, capitalizeWords } from '@/lib/utils';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PaymentSection } from '@/components/shared/PaymentSection';


const IVA_RATE = 0.16;

interface SaleSummaryProps {
  onOpenValidateDialog: (index: number) => void;
  validatedFolios: Record<number, boolean>;
}

export function SaleSummary({ onOpenValidateDialog, validatedFolios }: SaleSummaryProps) {
  const { control, watch, formState } = useFormContext();
  
  const watchedItems = watch("items");

  const { subTotal, tax, total } = useMemo(() => {
    const newTotalAmount = watchedItems?.reduce((sum: number, item: any) => sum + item.totalPrice || 0, 0) || 0;
    const newSubTotal = newTotalAmount / (1 + IVA_RATE);
    const newTax = newTotalAmount - newSubTotal;
    return { subTotal: newSubTotal, tax: newTax, total: newTotalAmount };
  }, [watchedItems]);

  const hasItems = watchedItems && watchedItems.length > 0;

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Resumen y Pago</CardTitle>
          <div className="pt-2">
           <FormField
              control={control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Cliente</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ej: Cliente Mostrador" 
                      {...field} 
                      value={field.value || ''}
                      onChange={(e) => field.onChange(capitalizeWords(e.target.value))} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
        </div>
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
                  <span className="font-medium">{formatCurrency(tax)}</span>
              </div>
               <div className="flex justify-between items-center text-lg font-bold pt-1 mt-1 border-t">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
              </div>
          </div>

          <Button
            type="submit"
            form="pos-form"
            disabled={formState.isSubmitting || !hasItems}
            className="w-full h-12 text-lg mt-4"
          >
            {formState.isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            Completar Venta ({formatCurrency(total)})
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
