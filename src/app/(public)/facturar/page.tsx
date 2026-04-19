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
import { Loader2, Search, FileText, FileJson, CheckCircle, AlertTriangle, Receipt } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { billingService } from '@/lib/services/billing.service';
import type { TicketType } from '@/types';
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
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 transition-opacity duration-300 rounded-xl">
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
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

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
        setError("No se encontró ningún ticket con la información proporcionada. Por favor, verifique el folio (Ej. RNR-A1B2) y el monto exacto.");
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
      setInvoiceUrl(result.invoiceUrl || null);
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
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-black via-zinc-900 to-black text-white">
            <header className="w-full p-6 flex justify-center">
              <Image src="/ranoro-logo.png" alt="Ranoro" width={140} height={40} className="invert object-contain" />
            </header>
            <div className="flex-1 flex items-center justify-center p-4">
              <Card className="max-w-md w-full text-center shadow-2xl bg-white/10 backdrop-blur-xl border-white/20 text-white animate-in fade-in zoom-in-95">
                  <CardContent className="p-8">
                      <CheckCircle className="mx-auto h-20 w-20 text-green-400 mb-6 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
                      <CardTitle className="text-2xl mb-2">¡Factura Generada!</CardTitle>
                      <CardDescription className="text-zinc-300 mb-8">
                          Tu factura ha sido timbrada exitosamente y enviada al SAT.
                      </CardDescription>
                      
                      {invoiceUrl && (
                        <Button asChild className="w-full bg-white text-black hover:bg-zinc-200 mb-4" size="lg">
                          <a href={invoiceUrl} target="_blank" rel="noreferrer">
                            Descargar Factura (PDF/XML)
                          </a>
                        </Button>
                      )}
                      
                      <Button onClick={() => window.location.reload()} variant="outline" className="w-full border-white/20 hover:bg-white/10 text-white">
                          Facturar otro ticket
                      </Button>
                  </CardContent>
              </Card>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-black via-zinc-900 to-black text-white">
       <header className="w-full p-6 flex justify-center border-b border-white/10 bg-black/40 backdrop-blur-md sticky top-0 z-40">
           <Link href="/">
             <Image src="/ranoro-logo.png" alt="Ranoro Logo" width={140} height={40} className="invert object-contain transition-opacity hover:opacity-80" />
           </Link>
       </header>

      <main className="flex-1 py-12 px-4 flex justify-center">
        <div className="w-full max-w-xl">
          <Card className="relative overflow-hidden bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl text-white">
             {isSubmitting && <LoadingOverlay message="Estamos conectando con el SAT y timbrando tu factura..." />}
            
            <CardHeader className="text-center pb-8 border-b border-white/10">
              <div className="mx-auto bg-primary/20 p-3 rounded-full w-fit mb-4">
                <Receipt className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl md:text-3xl font-black">Portal de Facturación</CardTitle>
              <CardDescription className="text-zinc-300 mt-2 text-sm md:text-base">
                Ingresa los datos de tu ticket RNR para generar tu CFDI.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-8">
              {!searchResult ? (
                <FormProvider {...searchForm}>
                  <Form {...searchForm}>
                    <form onSubmit={searchForm.handleSubmit(onSearchSubmit)} className="space-y-6">
                      <FormField
                        control={searchForm.control}
                        name="folio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-zinc-300 uppercase text-xs tracking-wider font-bold">Folio del Ticket</FormLabel>
                            <FormControl>
                              <Input className="bg-black/50 border-white/20 text-white placeholder:text-zinc-600 h-12 text-lg focus-visible:ring-primary uppercase" placeholder="Ej: RNR-A1B2" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={searchForm.control}
                        name="total"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-zinc-300 uppercase text-xs tracking-wider font-bold">Monto Exacto (con IVA)</FormLabel>
                            <FormControl>
                              <Input
                                className="bg-black/50 border-white/20 text-white placeholder:text-zinc-600 h-12 text-lg focus-visible:ring-primary"
                                type="number"
                                step="0.01"
                                placeholder="Ej: 1599.00"
                                {...field}
                                value={(field.value as any) ?? ""}
                                onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                              />
                            </FormControl>
                            <FormMessage className="text-red-400" />
                          </FormItem>
                        )}
                      />
                      
                      {error && (
                        <Alert className="bg-red-950/50 border-red-900/50 text-red-200">
                          <AlertTriangle className="h-4 w-4 text-red-400" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      
                      <Button type="submit" className="w-full h-12 font-bold text-base" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
                        Buscar Ticket
                      </Button>
                    </form>
                  </Form>
                </FormProvider>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                   <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="h-5 w-5 text-green-400" />
                        <h3 className="font-semibold text-lg">Ticket Validado</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-zinc-300">
                        <div>
                          <p className="text-zinc-500 uppercase text-xs mb-1">Folio</p>
                          <p className="font-medium text-white">{searchResult.id}</p>
                        </div>
                        <div>
                          <p className="text-zinc-500 uppercase text-xs mb-1">Monto</p>
                          <p className="font-medium text-white">{formatCurrency(ticketTotal)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-zinc-500 uppercase text-xs mb-1">Fecha</p>
                          <p className="text-white">{ticketDate && isValid(ticketDate) ? format(ticketDate, "dd MMMM, yyyy", {locale: es}) : 'N/A'}</p>
                        </div>
                      </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                      <FileJson className="text-primary h-5 w-5" />
                      Datos Fiscales
                    </h3>
                    
                    <FormProvider {...billingMethods}>
                      <Form {...billingMethods}>
                        <form onSubmit={billingMethods.handleSubmit(onBillingDataSubmit)} className="space-y-6">
                            {/* Make the Billing Form Fields text-white and custom borders via CSS if needed, 
                                since BillingForm is imported, its internals are Shadcn standard. 
                                We wrap it in a div that forces dark mode. */}
                            <div className="dark">
                              <BillingForm />
                            </div>
                            
                            <Button type="submit" className="w-full h-12 font-bold text-base mt-4" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <FileJson className="mr-2 h-5 w-5"/>}
                                {isSubmitting ? 'Procesando...' : 'Timbrar Factura'}
                            </Button>
                            
                            <Button type="button" variant="ghost" onClick={() => setSearchResult(null)} className="w-full h-12 hover:bg-white/5 text-zinc-400">
                                Volver a buscar
                            </Button>
                        </form>
                      </Form>
                    </FormProvider>
                  </div>
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
