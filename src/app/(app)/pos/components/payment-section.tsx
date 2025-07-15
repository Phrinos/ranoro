

"use client";

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, CreditCard, Send, WalletCards, ArrowRightLeft, MessageSquare } from 'lucide-react';
import type { PaymentMethod } from '@/types';
import { cn } from '@/lib/utils';
import { capitalizeWords } from '@/lib/utils';


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

export function PaymentSection({ isReadOnly = false, customerName }: { isReadOnly?: boolean, customerName?: string }) {
  const { control, watch, formState: { errors } } = useFormContext();
  const selectedPaymentMethod = watch("paymentMethod");

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Detalles de Pago</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  value={customerName || field.value}
                  onChange={(e) => field.onChange(capitalizeWords(e.target.value))} 
                  disabled={isReadOnly} 
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="whatsappNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de WhatsApp (Opcional)</FormLabel>
               <div className="relative">
                 <MessageSquare className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Input 
                      type="tel"
                      placeholder="Ej: 4491234567" 
                      {...field} 
                      disabled={isReadOnly} 
                      className="pl-8"
                    />
                  </FormControl>
               </div>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Método de Pago</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly}>
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
                <FormLabel className={cn(errors.cardFolio && "text-destructive")}>Folio Terminal (Tarjeta)</FormLabel>
                <FormControl><Input placeholder="Ingrese folio de la transacción" {...field} disabled={isReadOnly} className={cn(errors.cardFolio && "border-destructive focus-visible:ring-destructive")} /></FormControl>
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
                <FormLabel className={cn(errors.transferFolio && "text-destructive")}>Folio Transferencia</FormLabel>
                <FormControl><Input placeholder="Referencia de la transferencia" {...field} disabled={isReadOnly} className={cn(errors.transferFolio && "border-destructive focus-visible:ring-destructive")} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
