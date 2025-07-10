
"use client";

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, CreditCard, Send, WalletCards, ArrowRightLeft } from 'lucide-react';
import type { PaymentMethod } from '@/types';

const paymentMethods: [PaymentMethod, ...PaymentMethod[]] = [
  "Efectivo",
  "Tarjeta",
  "Transferencia",
  "Efectivo+Transferencia",
  "Tarjeta+Transferencia"
];

const paymentMethodIcons: Record<PaymentMethod, React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Transferencia": Send,
  "Efectivo+Transferencia": WalletCards,
  "Tarjeta+Transferencia": ArrowRightLeft,
};

export function PaymentSection() {
  const { control, watch } = useFormContext();
  const selectedPaymentMethod = watch("paymentMethod");

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <FormField
          control={control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Cliente</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Cliente Mostrador" {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Método de Pago</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Seleccione método de pago" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {paymentMethods.map(method => {
                    const Icon = paymentMethodIcons[method];
                    return (
                      <SelectItem key={method} value={method}>
                        <div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span>{method}</span></div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />
        {(selectedPaymentMethod === "Tarjeta" || selectedPaymentMethod === "Tarjeta+Transferencia") && (
          <FormField
            control={control}
            name="cardFolio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Folio Terminal (Tarjeta)</FormLabel>
                <FormControl><Input placeholder="Ingrese folio de la transacción" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {(selectedPaymentMethod === "Transferencia" || selectedPaymentMethod === "Efectivo+Transferencia" || selectedPaymentMethod === "Tarjeta+Transferencia") && (
          <FormField
            control={control}
            name="transferFolio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Folio Transferencia</FormLabel>
                <FormControl><Input placeholder="Referencia de la transferencia" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
