

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
import { Wallet, CreditCard, Send, WalletCards, ArrowRightLeft, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import React, { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";


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
  confirmCardFolio: z.string().optional(),
  transferFolio: z.string().optional(),
  confirmTransferFolio: z.string().optional(),
  amountInCash: z.coerce.number().optional(),
  amountInCard: z.coerce.number().optional(),
  amountInTransfer: z.coerce.number().optional(),
}).refine(data => {
  if (data.paymentMethod?.includes('Tarjeta')) {
    return data.cardFolio === data.confirmCardFolio;
  }
  return true;
}, {
  message: "Los folios de tarjeta no coinciden.",
  path: ["confirmCardFolio"],
}).refine(data => {
    if (data.paymentMethod?.includes('Transferencia')) {
        return data.transferFolio === data.confirmTransferFolio;
    }
    return true;
}, {
    message: "Los folios de transferencia no coinciden.",
    path: ["confirmTransferFolio"],
}).refine(data => {
  if (data.paymentMethod?.includes('Tarjeta') && !data.cardFolio) {
    return false;
  }
  return true;
}, {
  message: "El folio de la tarjeta es obligatorio.",
  path: ["cardFolio"],
}).refine(data => {
  if (data.paymentMethod?.includes('Transferencia') && !data.transferFolio) {
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
  const { toast } = useToast();
  const form = useForm<PaymentDetailsFormValues>({
    resolver: zodResolver(paymentDetailsSchema),
    defaultValues: {
      paymentMethod: service.paymentMethod,
      cardFolio: service.cardFolio || '',
      confirmCardFolio: service.cardFolio || '',
      transferFolio: service.transferFolio || '',
      confirmTransferFolio: service.transferFolio || '',
      amountInCash: service.amountInCash,
      amountInCard: service.amountInCard,
      amountInTransfer: service.amountInTransfer,
    }
  });
  
  const { watch, trigger, setValue, reset } = form;
  const selectedPaymentMethod = watch("paymentMethod");
  const isMixedPayment = selectedPaymentMethod?.includes('+') || selectedPaymentMethod?.includes('/');

  // Reset form when dialog opens/closes or service changes
  useEffect(() => {
    if (open) {
      reset({
        paymentMethod: service.paymentMethod,
        cardFolio: service.cardFolio || '',
        confirmCardFolio: service.cardFolio || '',
        transferFolio: service.transferFolio || '',
        confirmTransferFolio: service.transferFolio || '',
        amountInCash: service.amountInCash,
        amountInCard: service.amountInCard,
        amountInTransfer: service.amountInTransfer,
      });
    }
  }, [open, service, reset]);

  const handleFolioBlur = (field: 'cardFolio' | 'transferFolio') => {
    const confirmField = `confirm${field.charAt(0).toUpperCase() + field.slice(1)}` as 'confirmCardFolio' | 'confirmTransferFolio';
    
    const folioValue = form.getValues(field);
    const confirmFolioValue = form.getValues(confirmField);

    if (folioValue && confirmFolioValue && folioValue !== confirmFolioValue) {
        toast({
            title: "Los folios no coinciden",
            description: "Por favor, verifique e ingrese los folios nuevamente.",
            variant: "destructive"
        });
        setValue(field, '');
        setValue(confirmField, '');
    } else {
      trigger(confirmField);
    }
  };


  const handleFormSubmit = (values: PaymentDetailsFormValues) => {
    onConfirm(service.id, values);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
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
                        <SelectTrigger className="bg-white dark:bg-card">
                          <SelectValue placeholder="Seleccione método de pago" />
                        </SelectTrigger>
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
              {isMixedPayment && (
                <Card className="p-4 bg-white dark:bg-card">
                  <p className="text-sm font-medium mb-4">Desglose de Pago</p>
                  <div className="space-y-2">
                      {selectedPaymentMethod.includes('Efectivo') && (
                        <FormField control={form.control} name="amountInCash" render={({ field }) => (<FormItem><FormLabel>Monto en Efectivo</FormLabel><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><FormControl><Input type="number" {...field} value={field.value ?? ''} className="pl-8"/></FormControl></div><FormMessage /></FormItem>)} />
                      )}
                      {selectedPaymentMethod.includes('Tarjeta') && (
                        <FormField control={form.control} name="amountInCard" render={({ field }) => (<FormItem><FormLabel>Monto en Tarjeta</FormLabel><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><FormControl><Input type="number" {...field} value={field.value ?? ''} className="pl-8"/></FormControl></div><FormMessage /></FormItem>)} />
                      )}
                      {selectedPaymentMethod.includes('Transferencia') && (
                        <FormField control={form.control} name="amountInTransfer" render={({ field }) => (<FormItem><FormLabel>Monto en Transferencia</FormLabel><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><FormControl><Input type="number" {...field} value={field.value ?? ''} className="pl-8"/></FormControl></div><FormMessage /></FormItem>)} />
                      )}
                  </div>
                </Card>
              )}
              {(selectedPaymentMethod?.includes("Tarjeta")) && (
                <div className="space-y-2 pt-2">
                  <FormField control={form.control} name="cardFolio" render={({ field }) => (<FormItem><FormLabel>Folio Tarjeta</FormLabel><FormControl><Input placeholder="Folio de la transacción" {...field} value={field.value ?? ''} className="bg-white dark:bg-card" /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="confirmCardFolio" render={({ field }) => (<FormItem><FormLabel>Confirmar Folio Tarjeta</FormLabel><FormControl><Input placeholder="Vuelva a ingresar el folio" {...field} value={field.value ?? ''} onBlur={() => handleFolioBlur('cardFolio')} className="bg-white dark:bg-card" /></FormControl><FormMessage /></FormItem>)}/>
                </div>
              )}
              {(selectedPaymentMethod?.includes("Transferencia")) && (
                <div className="space-y-2 pt-2">
                  <FormField control={form.control} name="transferFolio" render={({ field }) => (<FormItem><FormLabel>Folio Transferencia</FormLabel><FormControl><Input placeholder="Referencia de la transferencia" {...field} value={field.value ?? ''} className="bg-white dark:bg-card" /></FormControl><FormMessage /></FormItem>)}/>
                  <FormField control={form.control} name="confirmTransferFolio" render={({ field }) => (<FormItem><FormLabel>Confirmar Folio Transferencia</FormLabel><FormControl><Input placeholder="Vuelva a ingresar el folio" {...field} value={field.value ?? ''} onBlur={() => handleFolioBlur('transferFolio')} className="bg-white dark:bg-card" /></FormControl><FormMessage /></FormItem>)}/>
                </div>
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
