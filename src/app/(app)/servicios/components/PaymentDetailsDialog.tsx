
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ServiceRecord, PaymentMethod } from "@/types";
import { Wallet, CreditCard, Send, WalletCards, ArrowRightLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

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

const paymentDetailsSchema = z.object({
  paymentMethod: z.enum(paymentMethods, { required_error: "Debe seleccionar un método de pago." }),
  cardFolio: z.string().optional(),
  transferFolio: z.string().optional(),
}).refine(data => {
  if ((data.paymentMethod?.includes('Tarjeta')) && !data.cardFolio) {
    return false;
  }
  return true;
}, {
  message: "El folio de la tarjeta es obligatorio.",
  path: ["cardFolio"],
}).refine(data => {
  if ((data.paymentMethod?.includes('Transferencia')) && !data.transferFolio) {
    return false;
  }
  return true;
}, {
  message: "El folio de la transferencia es obligatorio.",
  path: ["transferFolio"],
});

export type PaymentDetailsFormValues = z.infer<typeof paymentDetailsSchema>;

interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  service: ServiceRecord;
  onConfirm: (serviceId: string, paymentDetails: PaymentDetailsFormValues) => void;
}

export function PaymentDetailsDialog({
  open,
  onOpenChange,
  service,
  onConfirm,
}: PaymentDetailsDialogProps) {
  const form = useForm<PaymentDetailsFormValues>({
    resolver: zodResolver(paymentDetailsSchema),
    defaultValues: {
      paymentMethod: service.paymentMethod || undefined, // Set to undefined to show placeholder
      cardFolio: service.cardFolio || '',
      transferFolio: service.transferFolio || '',
    }
  });

  const selectedPaymentMethod = form.watch("paymentMethod");

  const handleFormSubmit = (values: PaymentDetailsFormValues) => {
    onConfirm(service.id, values);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Detalles de Pago</DialogTitle>
          <DialogDescription>Modifique el método de pago o los folios para el servicio {service.id}.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Total Pagado</p>
              <p className="text-4xl font-bold text-primary">{formatCurrency(service.totalCost)}</p>
            </CardContent>
          </Card>
          <Form {...form}>
            <form id="payment-details-form" onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              {(selectedPaymentMethod?.includes("Tarjeta")) && (
                <FormField control={form.control} name="cardFolio" render={({ field }) => (<FormItem><FormLabel>Folio Tarjeta</FormLabel><FormControl><Input placeholder="Folio de la transacción" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
              )}
              {(selectedPaymentMethod?.includes("Transferencia")) && (
                <FormField control={form.control} name="transferFolio" render={({ field }) => (<FormItem><FormLabel>Folio Transferencia</FormLabel><FormControl><Input placeholder="Referencia de la transferencia" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)}/>
              )}
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit" form="payment-details-form">Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
