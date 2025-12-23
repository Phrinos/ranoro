// src/app/(public)/facturar/page.tsx
"use client";

import { withSuspense } from "@/lib/withSuspense";
import { useSearchParams, useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Loader2, Search, FileText, FileJson, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { billingService } from '@/lib/services/billing.service';
import type { SaleReceipt, ServiceRecord, TicketType } from '@/types';
import { BillingForm } from './components/billing-form';
import { billingFormSchema, type BillingFormValues } from './components/billing-schema';
import { createInvoiceAction } from './actions';
import { formatCurrency } from '@/lib/utils';
import { parseDate } from '@/lib/forms';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { z } from "zod";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";


const searchSchema = z.object({
  folio: z.string().min(5, "El folio debe tener al menos 5 caracteres.").trim(),
  total: z.coerce.number({ message: "El monto debe ser un número."}).min(0.01, "El monto debe ser mayor a cero."),
});

type SearchFormInput = z.input<typeof searchSchema>;
type SearchFormValues = z.output<typeof searchSchema>;

const LoadingOverlay = ({ message }: { message: string }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 transition-opacity duration-300">
        <div className="text-center p-8 space-y-4">
            <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
            <h3 className="text-xl font-semibold tracking-tight">Procesando Solicitud</h3>
            <p className="text-muted-foreground">{message}</p>
        </div>
    </div>
);

function PageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResult, setSearchResult] = useState<TicketType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  const searchForm = useForm<SearchFormInput, any, SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { folio: '', total: undefined },
  });

  const billingMethods = useForm<z.input<typeof billingFormSchema>, any, BillingFormValues>({
    resolver: zodResolver(billingFormSchema),
  });


  const onSearchSubmit = useCallback(async (data: SearchFormValues) => {
    setIsLoading(true);
    setError(null);
    setSearchResult(null);
    
    try {
      const result = await billingService.findTicket(data.folio, data.total);
      if (result) {
        setSearchResult(result);
        toast({ title: "Ticket Encontrado", description: "Por favor, complete sus datos fiscales para facturar." });
      } else {
        setError("No se encontró ningún ticket con la información proporcionada. Por favor, verifique el folio y el monto.");
      }
    } catch (e: any) {
       setError(e.message || "Ocurrió un error al buscar el ticket.");
    } finally {
        setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const folio = searchParams.get('folio');
    const total = searchParams.get('total');
    
    if (folio) searchForm.setValue('folio', folio);
    if (total) searchForm.setValue('total', Number(total));
    
    if (folio && total) {
        onSearchSubmit({ folio, total: Number(total) });
    }
  }, [searchParams, searchForm, onSearchSubmit]);
  
  const onBillingDataSubmit = async (data: BillingFormValues) => {
    if (!searchResult) return;
    setIsSubmitting(true);
    try {
      const result = await createInvoiceAction(data, searchResult);
      if (!result.success) {
        throw new Error(result.error || 'Error al crear factura');
      }
      setSubmissionSuccess(true);
    } catch (err: any) {
      console.error('❌ Error al crear factura:', err);
      toast({ title: "Error al Facturar", description: err.message, variant: "destructive", duration: 7000 });
      setIsSubmitting(false);
    }
  };

  const getTicketDate = (ticket: TicketType | null): Date | null => {
    if (!ticket) return null;
    let dateField: any;
  
    if ('saleDate' in ticket) {
      dateField = ticket.saleDate;
    } else {
      dateField = (ticket as any).deliveryDateTime || (ticket as any).serviceDate;
    }
    
    return parseDate(dateField);
  };
  
  const ticketDate = getTicketDate(searchResult);
  const ticketTotal = !searchResult ? 0
  : ("totalAmount" in searchResult && typeof searchResult.totalAmount === "number") ? searchResult.totalAmount
  : ("totalCost" in searchResult && typeof (searchResult as any).totalCost === "number") ? (searchResult as any).totalCost
  : 0;
  
  if (submissionSuccess) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
             <Card className="max-w-md w-full text-center shadow-lg animate-in fade-in zoom-in-95">
                <CardContent className="p-8">
                    <CheckCircle className="mx-auto h-20 w-20 text-green-500 mb-6" />
                    <CardTitle className="text-2xl mb-2">¡Factura Generada!</CardTitle>
                    <CardDescription className="mb-8">
                        Tu factura ha sido creada exitosamente. En breve la recibirás en tu correo electrónico.
                    </CardDescription>
                    <Button onClick={() => window.location.reload()} className="w-full">
                        Facturar otro ticket
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
       <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
          <Link href="/" className="relative w-[140px] h-[40px]">
            <Image
              src="/ranoro-logo.png"
              alt="Ranoro Logo"
              fill
              style={{ objectFit: 'contain' }}
              className="dark:invert"
              priority
              sizes="(max-width: 768px) 120px, 140px"
              data-ai-hint="ranoro logo"
            />
          </Link>
        </div>
      </header>
      <main className="flex-1 py-8 md:py-12 lg:py-16">
        <div className="container mx-auto max-w-xl px-4 md:px-6">
           <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Sitio en Fase de Pruebas</AlertTitle>
                <AlertDescription>
                  El módulo de facturación se encuentra en fase de desarrollo. La funcionalidad podría no operar como se espera.
                </AlertDescription>
            </Alert>
          <Card className="relative overflow-hidden">
             {isSubmitting && <LoadingOverlay message="Estamos timbrando tu factura, por favor espera un momento..." />}
            <CardHeader>
              <CardTitle className="text-2xl">Portal de Auto-Facturación</CardTitle>
              <CardDescription>
                Ingresa los datos de tu ticket de servicio o venta para generar tu factura CFDI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!searchResult ? (
                <FormProvider {...searchForm}>
                  <Form {...searchForm}>
                    <form onSubmit={searchForm.handleSubmit(onSearchSubmit)} className="space-y-4">
                      <FormField
                        control={searchForm.control}
                        name="folio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Folio del Ticket</FormLabel>
                            <FormControl>
                              <Input placeholder="Ej: SALE-ABC123XYZ" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={searchForm.control}
                        name="total"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monto Total (con IVA)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Ej: 1599.00"
                                {...field}
                                value={(field.value as any) ?? ""}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Buscar Ticket
                      </Button>
                    </form>
                  </Form>
                </FormProvider>
              ) : (
                <div className="space-y-6">
                   <Alert variant="default" className="border-green-500 bg-green-50">
                      <FileText className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-700">Ticket Encontrado</AlertTitle>
                      <AlertDescription>
                        <p><strong>Folio:</strong> {searchResult.id}</p>
                        <p><strong>Fecha:</strong> {ticketDate && isValid(ticketDate) ? format(ticketDate, "dd MMMM, yyyy", {locale: es}) : 'N/A'}</p>
                        <p><strong>Total:</strong> {formatCurrency(ticketTotal)}</p>
                      </AlertDescription>
                  </Alert>

                  <h3 className="text-lg font-semibold border-t pt-4">Ingresa tus Datos Fiscales</h3>
                  <FormProvider {...billingMethods}>
                    <Form {...billingMethods}>
                      <form onSubmit={billingMethods.handleSubmit(onBillingDataSubmit)} className="space-y-4">
                          <BillingForm />
                          <Button type="submit" className="w-full" disabled={isSubmitting}>
                              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileJson className="mr-2 h-4 w-4"/>}
                              {isSubmitting ? 'Generando Factura...' : 'Generar Factura'}
                          </Button>
                      </form>
                    </Form>
                  </FormProvider>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default withSuspense(PageInner, null);
