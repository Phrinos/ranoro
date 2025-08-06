

"use client";

import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, CreditCard, Send, WalletCards, ArrowRightLeft, MessageSquare, DollarSign } from 'lucide-react';
import type { PaymentMethod } from '@/types';
import { cn } from '@/lib/utils';
import { capitalizeWords } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const paymentMethods: [PaymentMethod, ...PaymentMethod[]] = [
  "Efectivo",
  "Tarjeta",
  "Transferencia",
  "Efectivo+Transferencia",
  "Tarjeta+Transferencia",
  "Efectivo/Tarjeta"
];

const paymentMethodIcons: Record<PaymentMethod, React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Transferencia": Send,
  "Efectivo+Transferencia": WalletCards,
  "Tarjeta+Transferencia": ArrowRightLeft,
  "Efectivo/Tarjeta": WalletCards,
};

export function PaymentSection() {
  const form = useFormContext();
  const { control, watch, formState: { errors } } = form;
  const selectedPaymentMethod = watch("paymentMethod");

  const isMixedPayment = selectedPaymentMethod?.includes('+') || selectedPaymentMethod?.includes('/');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalles de Pago y Cliente</CardTitle>
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
                  value={field.value}
                  onChange={(e) => field.onChange(capitalizeWords(e.target.value))} 
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Select onValueChange={field.onChange} value={field.value}>
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
        </div>
        {isMixedPayment && (
          <div className="space-y-2 rounded-md border p-4">
            <p className="text-sm font-medium">Desglose de Pago</p>
            {selectedPaymentMethod.includes('Efectivo') && (
              <FormField control={control} name="amountInCash" render={({ field }) => (<FormItem><FormLabel>Monto en Efectivo</FormLabel><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><FormControl><Input type="number" {...field} value={field.value ?? ''} className="pl-8"/></FormControl></div><FormMessage /></FormItem>)} />
            )}
            {selectedPaymentMethod.includes('Tarjeta') && (
              <FormField control={control} name="amountInCard" render={({ field }) => (<FormItem><FormLabel>Monto en Tarjeta</FormLabel><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><FormControl><Input type="number" {...field} value={field.value ?? ''} className="pl-8"/></FormControl></div><FormMessage /></FormItem>)} />
            )}
            {selectedPaymentMethod.includes('Transferencia') && (
              <FormField control={control} name="amountInTransfer" render={({ field }) => (<FormItem><FormLabel>Monto en Transferencia</FormLabel><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><FormControl><Input type="number" {...field} value={field.value ?? ''} className="pl-8"/></FormControl></div><FormMessage /></FormItem>)} />
            )}
          </div>
        )}

        {(selectedPaymentMethod === "Tarjeta" || selectedPaymentMethod?.includes("Tarjeta")) && (
          <FormField
            control={control}
            name="cardFolio"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={cn(errors.cardFolio && "text-destructive")}>Folio Terminal (Tarjeta)</FormLabel>
                <FormControl><Input placeholder="Ingrese folio de la transacción" {...field} className={cn(errors.cardFolio && "border-destructive focus-visible:ring-destructive")} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {(selectedPaymentMethod === "Transferencia" || selectedPaymentMethod?.includes("Transferencia")) && (
          <FormField
            control={control}
            name="transferFolio"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={cn(errors.transferFolio && "text-destructive")}>Folio Transferencia</FormLabel>
                <FormControl><Input placeholder="Referencia de la transferencia" {...field} className={cn(errors.transferFolio && "border-destructive focus-visible:ring-destructive")} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
