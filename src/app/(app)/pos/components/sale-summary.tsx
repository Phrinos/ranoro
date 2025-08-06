
"use client";

import React, { useState, useEffect } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Receipt, Save, Loader2, Wallet, CreditCard, Send, PlusCircle, Trash2, DollarSign, CheckCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Payment } from '@/types';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';

const IVA_RATE = 0.16;

const paymentMethods: Payment['method'][] = ['Efectivo', 'Tarjeta', 'Tarjeta MSI', 'Transferencia'];

const paymentMethodIcons: Record<Payment['method'], React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Tarjeta MSI": CreditCard,
  "Transferencia": Send,
};

export function SaleSummary() {
  const { control, watch, formState } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "payments",
  });
  
  const { toast } = useToast();
  const watchedItems = watch("items");
  const watchedPayments = watch('payments');
  const [validatedFolios, setValidatedFolios] = useState<Record<number, boolean>>({});

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

  const availablePaymentMethods = paymentMethods.filter(
    method => !watchedPayments?.some((p: Payment) => p.method === method)
  );
  
  const totalPaid = watchedPayments?.reduce((acc: number, p: Payment) => acc + (Number(p.amount) || 0), 0) || 0;

  const handleValidateFolio = (index: number) => {
      const originalFolio = watch(`payments.${index}.folio`);
      const enteredFolio = prompt(`Por favor, reingrese el folio para validar:`, '');
      if (enteredFolio === null) return; 

      if (enteredFolio === originalFolio) {
          setValidatedFolios(prev => ({ ...prev, [index]: true }));
          toast({ title: "Folio Validado", description: "El folio coincide correctamente." });
      } else {
          setValidatedFolios(prev => ({ ...prev, [index]: false }));
          toast({ title: "Error de Validación", description: "Los folios no coinciden. Por favor, verifique.", variant: "destructive" });
      }
  };


  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Resumen y Pago</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col space-y-4 flex-grow">
        {/* Payment Methods */}
        <div className="space-y-2">
            <FormLabel>Métodos de Pago</FormLabel>
            {fields.map((field, index) => {
                    const selectedMethod = watchedPayments[index]?.method;
                    const showFolio = selectedMethod === 'Tarjeta' || selectedMethod === 'Tarjeta MSI' || selectedMethod === 'Transferencia';
                    const folioLabel = selectedMethod === 'Transferencia' ? 'Folio/Referencia' : 'Folio de Voucher';
                    const isFolioValidated = validatedFolios[index];

                    return (
                        <Card key={field.id} className="p-4 bg-muted/50">
                            <div className="flex gap-2 items-end">
                                <FormField
                                    control={control}
                                    name={`payments.${index}.amount`}
                                    render={({ field }) => (
                                        <FormItem className="flex-grow">
                                            <div className="relative">
                                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <FormControl>
                                                    <Input type="number" step="0.01" {...field} value={field.value ?? ''} placeholder="0.00" className="pl-8"/>
                                                </FormControl>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`payments.${index}.method`}
                                    render={({ field }) => (
                                        <FormItem className="w-48">
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {paymentMethods.map(method => {
                                                        const Icon = paymentMethodIcons[method];
                                                        return (<SelectItem key={method} value={method} disabled={availablePaymentMethods.indexOf(method as any) === -1 && method !== selectedMethod}>
                                                                    <div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span>{method}</span></div>
                                                                </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                {fields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                            </div>
                            {showFolio && (
                                <div className="flex items-end gap-2 mt-2">
                                     <FormField
                                        control={control}
                                        name={`payments.${index}.folio`}
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl>
                                                    <div className="relative">
                                                        <Input placeholder={folioLabel} {...field} value={field.value ?? ''} />
                                                        {isFolioValidated && <CheckCircle className="absolute right-2 top-2.5 h-5 w-5 text-green-500" />}
                                                    </div>
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="button" variant="secondary" size="sm" onClick={() => handleValidateFolio(index)}>Validar</Button>
                                </div>
                            )}
                            <FormField
                                control={control}
                                name={`payments.${index}.amount`}
                                render={() => <FormMessage />}
                            />
                        </Card>
                    );
            })}
            {availablePaymentMethods.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ method: availablePaymentMethods[0], amount: undefined, folio: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Añadir método de pago
                    </Button>
            )}
        </div>

        {/* Totals Section */}
        <div className="w-full mt-auto space-y-2">
            <div className="text-lg w-full flex justify-between pt-4 border-t"><span>Subtotal:</span> <span className="font-semibold">{formatCurrency(subTotal)}</span></div>
            <div className="text-sm text-muted-foreground w-full flex justify-between"><span>IVA ({(IVA_RATE * 100).toFixed(0)}%):</span> <span className="font-semibold">{formatCurrency(tax)}</span></div>
            <div className="text-2xl font-bold w-full flex justify-between pt-2 border-t"><span>Total:</span> <span className="text-primary">{formatCurrency(total)}</span></div>
        </div>
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
      </CardContent>
    </Card>
  );
}
