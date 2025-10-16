// src/app/(app)/inventario/compras/components/payable-account-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DollarSign } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { payableAccountFormSchema, type PayableAccountFormValues } from '@/schemas/payable-account-form-schema';
import type { PayableAccount } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const paymentMethods: ('Efectivo' | 'Transferencia')[] = ['Efectivo', 'Transferencia'];

interface PayableAccountFormProps {
  id: string;
  onSubmit: (values: PayableAccountFormValues) => Promise<void>;
  account: PayableAccount;
}

export function PayableAccountForm({ id, onSubmit, account }: PayableAccountFormProps) {
  const form = useForm<PayableAccountFormValues, any, PayableAccountFormValues>({
    resolver: zodResolver(payableAccountFormSchema((account.totalAmount ?? 0) - (account.paidAmount || 0))) as Resolver<PayableAccountFormValues, any, PayableAccountFormValues>,
    defaultValues: {
      amount: (account.totalAmount ?? 0) - (account.paidAmount || 0),
      note: "",
      paymentMethod: 'Efectivo',
    },
  });

  return (
    <Form {...form}>
      <form id={id} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto a Pagar</FormLabel>
              <FormControl>
                  <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="number" step="0.01" {...field} value={field.value ?? ''} className="pl-8" />
                  </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="paymentMethod" render={({ field }) => ( <FormItem><FormLabel>Método de Pago</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem> )}/>
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nota / Referencia (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Ej: Transferencia desde Banorte" {...field} value={field.value ?? ''}/>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
