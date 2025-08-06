
"use client";

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, CreditCard, Send } from 'lucide-react';
import type { Payment } from '@/types';
import { Button } from '@/components/ui/button';
import { capitalizeWords, formatCurrency } from '@/lib/utils';
import { DollarSign, PlusCircle, Trash2 } from 'lucide-react';

const paymentMethods: Payment['method'][] = ['Efectivo', 'Tarjeta', 'Tarjeta MSI', 'Transferencia'];

const paymentMethodIcons: Record<Payment['method'], React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Tarjeta MSI": CreditCard,
  "Transferencia": Send,
};

export function PaymentSection({ isReadOnly = false }: { isReadOnly?: boolean }) {
  const { control, watch } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "payments",
  });

  const watchedPayments = watch("payments");
  const isDelivered = watch('status') === 'Entregado';

  const availablePaymentMethods = paymentMethods.filter(
    method => !watchedPayments?.some((p: Payment) => p.method === method)
  );
  
  const totalPaid = watchedPayments?.reduce((acc: number, p: Payment) => acc + (Number(p.amount) || 0), 0) || 0;
  
  if (isReadOnly && isDelivered) {
    return (
       <Card>
        <CardHeader>
            <CardTitle>Detalles del Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
           {watchedPayments?.map((p: Payment, index: number) => (
             <div key={index} className="flex justify-between">
                <span className="text-muted-foreground">{p.method} {p.folio && `(Folio: ${p.folio})`}:</span>
                <span className="font-semibold">{formatCurrency(p.amount)}</span>
            </div>
           ))}
        </CardContent>
       </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métodos de Pago</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4 rounded-md border p-4">
           {fields.map((field, index) => {
                const selectedMethod = watchedPayments[index]?.method;
                const showFolio = selectedMethod === 'Tarjeta' || selectedMethod === 'Tarjeta MSI' || selectedMethod === 'Transferencia';
                const folioLabel = selectedMethod === 'Transferencia' ? 'Folio de Transferencia' : 'Folio de Voucher';

                return (
                    <div key={field.id} className="space-y-2">
                        <div className="flex gap-2 items-end">
                            <FormField
                                control={control}
                                name={`payments.${index}.amount`}
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <div className="relative">
                                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <FormControl>
                                                <Input type="number" step="0.01" {...field} value={field.value === 0 ? '' : field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} className="pl-8" disabled={isReadOnly} placeholder="0.00"/>
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
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
                                            <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
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
                            {!isReadOnly && fields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                        </div>
                        {showFolio && (
                             <FormField
                                control={control}
                                name={`payments.${index}.folio`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input placeholder={folioLabel} {...field} value={field.value ?? ''} disabled={isReadOnly} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        )}
                        <FormField
                            control={control}
                            name={`payments.${index}.amount`}
                            render={() => <FormMessage />}
                        />
                    </div>
                );
           })}
           {!isReadOnly && availablePaymentMethods.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => append({ method: availablePaymentMethods[0], amount: undefined, folio: '' })}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Añadir método de pago
                </Button>
           )}
           <div className="flex justify-end font-semibold pt-2 border-t">
                Total Pagado: {formatCurrency(totalPaid)}
           </div>
            <FormField
              control={control}
              name="payments"
              render={({ field }) => <FormMessage />}
            />
        </div>
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
                    disabled={isReadOnly} 
                    />
                </FormControl>
                </FormItem>
            )}
            />
      </CardContent>
    </Card>
  );
}
