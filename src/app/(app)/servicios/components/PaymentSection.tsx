// src/app/(app)/servicios/components/PaymentSection.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet, CreditCard, Send, PlusCircle, Trash2, DollarSign, CheckCircle } from 'lucide-react';
import type { Payment, ServiceFormValues } from '@/types';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { useServiceTotals } from '@/hooks/use-service-form-hooks';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';

const paymentMethods: Payment['method'][] = ['Efectivo', 'Tarjeta', 'Tarjeta MSI', 'Transferencia'];

const paymentMethodIcons: Record<Payment['method'], React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Tarjeta MSI": CreditCard,
  "Transferencia": Send,
};

export function PaymentSection({ isReadOnly = false }: { isReadOnly?: boolean }) {
  const form = useFormContext<ServiceFormValues>();
  const { control, watch, setValue } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "payments",
  });
  
  const { toast } = useToast();
  const { totalCost, subTotal, taxAmount, totalSuppliesWorkshopCost, serviceProfit } = useServiceTotals(form);
  const watchedPayments = watch("payments");
  const previousPaymentsRef = useRef<Payment[]>([]);

  // State for folio validation
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false);
  const [validationIndex, setValidationIndex] = useState<number | null>(null);
  const [validationFolio, setValidationFolio] = useState('');
  const [validatedFolios, setValidatedFolios] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const currentPayments = watchedPayments || [];
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
  }, [watchedPayments]);

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

  const availablePaymentMethods = paymentMethods.filter(
    method => !watchedPayments?.some((p: Payment) => p.method === method)
  );
  
  const totalPaid = watchedPayments?.reduce((acc: number, p: Payment) => acc + (Number(p.amount) || 0), 0) || 0;
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Resumen y Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Totals Section */}
          <div className="w-full space-y-2">
              <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA (16%):</span>
                  <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>TOTAL:</span>
                  <span className="text-primary">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Costo Insumos (Taller):</span>
                  <span className="font-medium">{formatCurrency(totalSuppliesWorkshopCost)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-green-600">
                  <span>Ganancia Bruta:</span>
                  <span>{formatCurrency(serviceProfit)}</span>
              </div>
          </div>
          
          {/* Payment Methods Section */}
          <div className="space-y-4 rounded-md border p-4 pt-4 border-t">
             <FormLabel>Métodos de Pago</FormLabel>
             {fields.map((field, index) => {
                  const selectedMethod = watchedPayments[index]?.method;
                  const showFolio = selectedMethod === 'Tarjeta' || selectedMethod === 'Tarjeta MSI' || selectedMethod === 'Transferencia';
                  const folioLabel = selectedMethod === 'Transferencia' ? 'Folio/Referencia' : 'Folio de Voucher';
                  const isFolioValidated = validatedFolios[index];

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
                                                  <Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} placeholder="0.00" className="pl-8" />
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
                                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={isReadOnly}>
                                              <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                              <SelectContent>{paymentMethods.map(method => (<SelectItem key={method} value={method} disabled={availablePaymentMethods.indexOf(method as any) === -1 && method !== selectedMethod}><div className="flex items-center gap-2">{React.createElement(paymentMethodIcons[method], {className: "h-4 w-4"})}<span>{method}</span></div></SelectItem>))}</SelectContent>
                                          </Select>
                                      </FormItem>
                                  )}
                              />
                              {!isReadOnly && fields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>}
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
                                                      <Input placeholder={folioLabel} {...field} value={field.value ?? ''} disabled={isReadOnly} />
                                                      {isFolioValidated && <CheckCircle className="absolute right-2 top-2.5 h-5 w-5 text-green-500" />}
                                                  </div>
                                              </FormControl>
                                          </FormItem>
                                      )}
                                  />
                                  {!isReadOnly && (selectedMethod === 'Tarjeta' || selectedMethod === 'Tarjeta MSI') && (
                                    <Button type="button" variant="secondary" size="sm" onClick={() => handleOpenValidateDialog(index)}>Validar</Button>
                                  )}
                              </div>
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
                  <div className="flex justify-end">
                      <Button type="button" variant="outline" size="sm" onClick={() => append({ method: availablePaymentMethods[0], amount: undefined, folio: '' })}>
                          <PlusCircle className="mr-2 h-4 w-4"/> Añadir método de pago
                      </Button>
                  </div>
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
        </CardContent>
      </Card>
      
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
