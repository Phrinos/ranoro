

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import type { ServiceRecord, PaymentMethod, SaleReceipt, Payment } from "@/types";
import { Wallet, CreditCard, Send, WalletCards, ArrowRightLeft, DollarSign, Trash2, PlusCircle, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import React, { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";


const paymentMethods: Payment['method'][] = [
  "Efectivo",
  "Tarjeta",
  "Tarjeta MSI",
  "Transferencia",
];

const paymentMethodIcons: Record<Payment['method'], React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Tarjeta MSI": CreditCard,
  "Transferencia": Send,
};

const paymentDetailsSchema = z.object({
  payments: z.array(z.object({
    method: z.enum(paymentMethods),
    amount: z.coerce.number().min(0.01, "El monto debe ser mayor a cero.").optional(),
    folio: z.string().optional(),
  })).min(1, "Debe agregar al menos un método de pago."),
}).superRefine((data, ctx) => {
    // Total amount charged to the customer
    const totalPayments = data.payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    // This validation is tricky without the total amount. It will be done in the parent component.
    
    data.payments.forEach((payment, index) => {
        if ((payment.method === 'Tarjeta' || payment.method === 'Tarjeta MSI') && !payment.folio) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'El folio es obligatorio para pagos con tarjeta.',
                path: [`payments`, index, 'folio'],
            });
        }
    });
});


export type PaymentDetailsFormValues = z.infer<typeof paymentDetailsSchema>;

interface PaymentDetailsDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  record: ServiceRecord | SaleReceipt;
  onConfirm: (recordId: string, paymentDetails: PaymentDetailsFormValues) => void;
  isCompletionFlow?: boolean;
}

export function PaymentDetailsDialog({
  open,
  onOpenChange,
  record,
  onConfirm,
  isCompletionFlow = false,
}: PaymentDetailsDialogProps) {
  const { toast } = useToast();
  const totalAmount = 'totalCost' in record ? record.totalCost : record.totalAmount;

  const form = useForm<PaymentDetailsFormValues>({
    resolver: zodResolver(paymentDetailsSchema),
    defaultValues: {
      payments: record.payments?.length ? record.payments : [{ method: 'Efectivo', amount: totalAmount, folio: '' }],
    }
  });
  
  const { watch, control, handleSubmit, reset } = form;
  
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [validationIndex, setValidationIndex] = useState<number | null>(null);
  const [validationFolio, setValidationFolio] = useState('');
  const [validatedFolios, setValidatedFolios] = useState<Record<number, boolean>>({});
  const previousPaymentsRef = useRef<Payment[]>([]);

  useEffect(() => {
    const currentPayments = watch('payments') || [];
    currentPayments.forEach((currentPayment: Payment, index: number) => {
      const previousPayment = previousPaymentsRef.current[index];
      if (previousPayment && currentPayment.method !== previousPayment.method) {
        setValidatedFolios(prev => {
          const newValidated = { ...prev };
          delete newValidated[index];
          return newValidated;
        });
      }
    });
    previousPaymentsRef.current = JSON.parse(JSON.stringify(currentPayments || []));
  }, [watch('payments')]);

  useEffect(() => {
    if (open) {
      reset({
        payments: record.payments?.length ? record.payments : [{ method: 'Efectivo', amount: totalAmount || undefined, folio: '' }],
      });
      setValidatedFolios({});
    }
  }, [open, record, totalAmount, reset]);

  const handleFormSubmit = (values: PaymentDetailsFormValues) => {
    const totalPaid = values.payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    if (Math.abs(totalPaid - totalAmount) > 0.01) {
        toast({
            title: "El pago no coincide",
            description: `El total pagado (${formatCurrency(totalPaid)}) no coincide con el total del registro (${formatCurrency(totalAmount)}).`,
            variant: "destructive"
        });
        return;
    }
    onConfirm(record.id, values);
  };

  const handleOpenValidateDialog = (index: number) => {
    setValidationIndex(index);
    setValidationFolio('');
    setIsValidationDialogOpen(true);
  };

  const handleConfirmValidation = () => {
    if (validationIndex === null) return;
    const originalFolio = watch(`payments.${validationIndex}.folio`);
    
    if (validationFolio === originalFolio) {
      setValidatedFolios(prev => ({ ...prev, [validationIndex]: true }));
      toast({ title: "Folio Validado", description: "El folio coincide correctamente." });
    } else {
      setValidatedFolios(prev => {
          const newValidated = { ...prev };
          delete newValidated[validationIndex];
          return newValidated;
      });
      toast({ title: "Error de Validación", description: "Los folios no coinciden. Por favor, verifique.", variant: "destructive" });
    }
    setIsValidationDialogOpen(false);
  };
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: "payments"
  });

  const availablePaymentMethods = paymentMethods.filter(
    method => !watch('payments')?.some((p: Payment) => p.method === method)
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>{isCompletionFlow ? "Completar y Cobrar" : "Editar Detalles de Pago"}</DialogTitle>
            <DialogDescription>{`Confirme los detalles de pago para el folio ${record.id}`}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Total a Pagar</p>
                <p className="text-4xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
              </CardContent>
            </Card>
            <Form {...form}>
              <form id="payment-details-form" onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
                {fields.map((field, index) => {
                    const selectedMethod = watch(`payments.${index}.method`);
                    const showFolio = selectedMethod === 'Tarjeta' || selectedMethod === 'Tarjeta MSI' || selectedMethod === 'Transferencia';
                    const folioLabel = selectedMethod === 'Transferencia' ? 'Folio/Referencia' : 'Folio de Voucher';
                    const isFolioValidated = validatedFolios[index];
                    return (
                      <Card key={field.id} className="p-4 bg-muted/50">
                          <div className="flex gap-2 items-end">
                              <FormField control={control} name={`payments.${index}.amount`} render={({ field }) => (<FormItem className="flex-grow"><FormLabel>Monto</FormLabel><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><FormControl><Input type="number" step="0.01" {...field} value={field.value === 0 ? '' : field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} placeholder="0.00" className="pl-8"/></FormControl></div></FormItem>)}/>
                              <FormField control={control} name={`payments.${index}.method`} render={({ field }) => (<FormItem className="w-48"><FormLabel>Método</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{paymentMethods.map(method => (<SelectItem key={method} value={method} disabled={availablePaymentMethods.indexOf(method as any) === -1 && method !== selectedMethod}><div className="flex items-center gap-2">{React.createElement(paymentMethodIcons[method], {className: "h-4 w-4"})}<span>{method}</span></div></SelectItem>))}</SelectContent></Select></FormItem>)}/>
                              {fields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>}
                          </div>
                           {showFolio && (
                               <div className="flex items-end gap-2 mt-2">
                                  <FormField control={control} name={`payments.${index}.folio`} render={({ field }) => (<FormItem className="flex-grow"><FormControl><div className="relative"><Input placeholder={folioLabel} {...field} value={field.value ?? ''} /><FormMessage />{isFolioValidated && <CheckCircle className="absolute right-2 top-2.5 h-5 w-5 text-green-500" />}</div></FormControl></FormItem>)} />
                                  {(selectedMethod === 'Tarjeta' || selectedMethod === 'Tarjeta MSI') && (
                                    <Button type="button" variant="secondary" size="sm" onClick={() => handleOpenValidateDialog(index)}>Validar</Button>
                                  )}
                              </div>
                          )}
                           <FormMessage className="mt-2 text-red-500">{form.formState.errors?.payments?.[index]?.amount?.message}</FormMessage>
                      </Card>
                    );
                })}
                {availablePaymentMethods.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ method: availablePaymentMethods[0], amount: undefined, folio: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Añadir método de pago
                    </Button>
                )}
              </form>
            </Form>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" form="payment-details-form">{isCompletionFlow ? 'Completar y Cobrar' : 'Guardar Cambios'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <AlertDialog open={isValidationDialogOpen} onOpenChange={setIsValidationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validar Folio</AlertDialogTitle>
            <AlertDialogDescription>
              Para evitar errores, por favor ingrese nuevamente el folio del voucher o referencia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="folio-validation-input">Reingresar Folio</Label>
            <Input
              id="folio-validation-input"
              value={validationFolio}
              onChange={(e) => setValidationFolio(e.target.value)}
              className="mt-2"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmValidation}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
