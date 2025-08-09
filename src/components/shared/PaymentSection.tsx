
// src/components/shared/PaymentSection.tsx

"use client";

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, CreditCard, Send, CheckCircle } from 'lucide-react';
import type { Payment } from '@/types';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, PlusCircle, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

const paymentMethods: Payment['method'][] = ['Efectivo', 'Tarjeta', 'Tarjeta MSI', 'Transferencia'];

const paymentMethodIcons: Record<Payment['method'], React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Tarjeta MSI": CreditCard,
  "Transferencia": Send,
};

interface PaymentSectionProps {
  onOpenValidateDialog: (index: number) => void;
  validatedFolios: Record<number, boolean>;
}

export function PaymentSection({ onOpenValidateDialog, validatedFolios }: PaymentSectionProps) {
  const { control, watch } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "payments",
  });
  
  const watchedPayments = watch('payments');
  const watchedItems = watch('items') || watch('serviceItems');

  const availablePaymentMethods = paymentMethods.filter(
    method => !watchedPayments?.some((p: Payment) => p.method === method)
  );
  
  const totalPaid = watchedPayments?.reduce((acc: number, p: Payment) => acc + (Number(p.amount) || 0), 0) || 0;
  
  const totalItemsAmount = watchedItems?.reduce((sum: number, item: any) => sum + (item.totalPrice || item.price || 0), 0) || 0;

  return (
    <Card className="p-4">
        <FormLabel>Métodos de Pago</FormLabel>
        <div className="space-y-4 mt-2">
            {fields.map((field, index) => {
                const selectedMethod = watchedPayments[index]?.method;
                const showFolio = selectedMethod === 'Tarjeta' || selectedMethod === 'Tarjeta MSI' || selectedMethod === 'Transferencia';
                const folioLabel = selectedMethod === 'Transferencia' ? 'Folio de Transferencia' : 'Folio de Voucher';
                const isFolioValidated = validatedFolios[index];

                return (
                    <div key={field.id} className="space-y-2 p-3 border rounded-md bg-background">
                        <div className="flex gap-2 items-end">
                            <FormField
                                control={control}
                                name={`payments.${index}.amount`}
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <div className="relative">
                                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} value={field.value ?? ''} className="pl-8 bg-white"/>
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
                                            <FormControl><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {paymentMethods.map(method => {
                                                    const Icon = paymentMethodIcons[method];
                                                    return (<SelectItem key={method} value={method} disabled={availablePaymentMethods.indexOf(method) === -1 && method !== selectedMethod}>
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
                                                    <Input placeholder={folioLabel} {...field} value={field.value ?? ''} className="bg-white"/>
                                                    {isFolioValidated && <CheckCircle className="absolute right-2 top-2.5 h-5 w-5 text-green-500" />}
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {(selectedMethod === 'Tarjeta' || selectedMethod === 'Tarjeta MSI') && (
                                    <Button type="button" variant="destructive" size="sm" onClick={() => onOpenValidateDialog(index)}>
                                        Validar
                                    </Button>
                                )}
                            </div>
                        )}
                         <FormMessage className="text-red-500">{control.getFieldState(`payments.${index}.amount`)?.error?.message}</FormMessage>
                    </div>
                );
            })}
            {availablePaymentMethods.length > 0 && fields.length < paymentMethods.length && (
                 <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ method: availablePaymentMethods[0], amount: undefined, folio: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Añadir método de pago
                    </Button>
                 </div>
            )}
            <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total Pagado:</span>
                <span>{formatCurrency(totalPaid)}</span>
            </div>
             <div className="flex justify-between font-semibold text-destructive">
                <span>Faltante por Pagar:</span>
                <span>{formatCurrency(Math.max(0, totalItemsAmount - totalPaid))}</span>
            </div>
            <FormField
                control={control}
                name="payments"
                render={({ field }) => <FormMessage />}
            />
        </div>
    </Card>
  );
}
