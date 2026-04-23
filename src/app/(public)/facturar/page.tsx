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
import { Loader2, Search, FileText, FileJson, CheckCircle, AlertTriangle, Receipt, Mail } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import type { TicketType } from '@/types';
import { BillingForm } from './components/billing-form';
import { billingFormSchema, type BillingFormValues } from './components/billing-schema';
import { createInvoiceAction, findTicketAction } from './actions';
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
    <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center z-20 transition-opacity duration-300 rounded-xl">
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
  
  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingBillingData, setPendingBillingData] = useState<BillingFormValues | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);

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
      const result = await findTicketAction(data.folio, data.total);
      if (result.success && result.ticket) {
        setSearchResult(result.ticket as TicketType);
        
        // If the ticket has already been invoiced, skip the form and show the existing invoice
        if ((result.ticket as any).invoiceUrl || (result.ticket as any).invoiceId) {
            setInvoiceUrl((result.ticket as any).invoiceUrl || null);
            setSubmissionSuccess(true);
            toast({ title: "Factura Existente", description: "Este ticket ya ha sido facturado previamente." });
        } else {
            toast({ title: "Ticket Encontrado", description: "Por favor, complete sus datos fiscales para facturar." });
        }
      } else {
        setError(result.error || "No se encontró ningún ticket con la información proporcionada. Por favor, verifique el folio y el monto exacto.");
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
  
  const handlePreSubmit = (data: BillingFormValues) => {
    setPendingBillingData(data);
    setAcceptTerms(false);
    setShowConfirmModal(true);
  };

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
        <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-foreground">
            <header className="w-full p-6 flex justify-center border-b bg-background/80 backdrop-blur-md">
              <Image src="/ranoro-logo.png" alt="Ranoro" width={140} height={40} className="object-contain dark:invert" />
            </header>
            <div className="flex-1 flex items-center justify-center p-4">
              <Card className="max-w-md w-full text-center shadow-xl animate-in fade-in zoom-in-95 border">
                  <CardContent className="p-8">
                      <div className="mx-auto bg-green-100 dark:bg-green-900/30 p-4 rounded-full w-fit mb-6">
                        <CheckCircle className="h-14 w-14 text-green-600 dark:text-green-400" />
                      </div>
                      <CardTitle className="text-2xl mb-2 font-bold">¡Factura Generada!</CardTitle>
                      <CardDescription className="mb-8 text-base">
                          Tu factura ha sido timbrada exitosamente y enviada al SAT.
                      </CardDescription>
                      
                      {invoiceUrl && (
                        <Button asChild className="w-full mb-4 shadow-sm" size="lg">
                          <a href={invoiceUrl} target="_blank" rel="noreferrer">
                            <FileText className="mr-2 h-5 w-5" />
                            Descargar Factura (PDF/XML)
                          </a>
                        </Button>
                      )}
                      
                      <Button onClick={() => window.location.href = '/facturar'} variant="outline" className="w-full shadow-sm">
                          Facturar otro ticket
                      </Button>

                      <div className="mt-8 pt-6 border-t flex flex-col items-center text-sm text-muted-foreground">
                        <Mail className="h-5 w-5 mb-2 text-primary/60" />
                        <p>¿Tienes dudas o necesitas una aclaración?</p>
                        <p>Envía un correo a <a href="mailto:contador@casadenobles.com" className="font-semibold text-primary hover:underline">contador@casadenobles.com</a></p>
                      </div>
                  </CardContent>
              </Card>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-foreground selection:bg-primary/20">
       <header className="w-full p-5 flex justify-center border-b bg-background/80 backdrop-blur-md sticky top-0 z-40 shadow-sm">
           <Link href="/" className="hover:scale-105 transition-transform duration-200">
             <Image src="/ranoro-logo.png" alt="Ranoro Logo" width={150} height={45} className="object-contain dark:invert" />
           </Link>
       </header>

      <main className="flex-1 py-12 px-4 flex justify-center items-start">
        <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-500">
          <Card className="relative overflow-hidden bg-card shadow-2xl border">
             {isSubmitting && <LoadingOverlay message="Estamos conectando con el SAT y timbrando tu factura..." />}
            
            <CardHeader className="text-center pb-8 border-b bg-muted/30">
              <div className="mx-auto bg-primary/10 p-3.5 rounded-2xl w-fit mb-5 shadow-inner">
                <Receipt className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-black tracking-tight text-foreground">Portal de Facturación</CardTitle>
              <CardDescription className="mt-3 text-base font-medium">
                Ingresa los datos de tu ticket para generar tu comprobante fiscal.
              </CardDescription>

              <div className="mt-6 text-left">
                <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 shadow-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="font-bold text-amber-900 dark:text-amber-100">Políticas de Facturación</AlertTitle>
                  <AlertDescription className="text-xs sm:text-sm mt-1 leading-relaxed">
                    Recuerda que solo tienes <strong>48 horas</strong> posteriores a la emisión de tu ticket para generar tu factura. 
                    Si es el <strong>último día del mes</strong>, deberás solicitarla antes de las <strong>20:00 horas</strong>.
                  </AlertDescription>
                </Alert>
              </div>
            </CardHeader>
            
            <CardContent className="pt-8 px-6 sm:px-10 pb-10">
              {!searchResult ? (
                <FormProvider {...searchForm}>
                  <Form {...searchForm}>
                    <form onSubmit={searchForm.handleSubmit(onSearchSubmit)} className="space-y-6">
                      <FormField
                        control={searchForm.control}
                        name="folio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="uppercase text-[11px] tracking-wider font-bold text-muted-foreground">Folio del Ticket</FormLabel>
                            <FormControl>
                              <Input className="h-12 text-lg uppercase shadow-xs transition-shadow focus-visible:ring-primary/50" placeholder="Ej: RNR-A1B2" {...field} value={field.value ?? ''} />
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
                            <FormLabel className="uppercase text-[11px] tracking-wider font-bold text-muted-foreground">Monto Exacto (con IVA)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-lg">$</span>
                                <Input
                                  className="pl-8 h-12 text-lg shadow-xs transition-shadow focus-visible:ring-primary/50"
                                  type="number"
                                  step="0.01"
                                  placeholder="Ej: 1599.00"
                                  {...field}
                                  value={(field.value as any) ?? ""}
                                  onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {error && (
                        <Alert variant="destructive" className="animate-in fade-in zoom-in-95">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      
                      <Button type="submit" size="lg" className="w-full h-14 font-bold text-base shadow-md hover:shadow-lg transition-all active:scale-[0.98]" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
                        {isLoading ? 'Buscando...' : 'Buscar Ticket'}
                      </Button>
                    </form>
                  </Form>
                </FormProvider>
              ) : (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                   <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-5">
                        <CheckCircle className="h-6 w-6 text-primary" />
                        <h3 className="font-bold text-lg text-foreground">Ticket Validado</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                        <div>
                          <p className="text-muted-foreground uppercase text-[10px] tracking-wider font-bold mb-1">Folio</p>
                          <p className="font-semibold text-base">{searchResult.id}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground uppercase text-[10px] tracking-wider font-bold mb-1">Monto</p>
                          <p className="font-semibold text-base text-primary">{formatCurrency(ticketTotal)}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground uppercase text-[10px] tracking-wider font-bold mb-1">Fecha de Operación</p>
                          <p className="font-medium text-base">{ticketDate && isValid(ticketDate) ? format(ticketDate, "dd 'de' MMMM, yyyy", {locale: es}) : 'N/A'}</p>
                        </div>
                      </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-4">
                      <FileJson className="text-primary h-5 w-5" />
                      Tus Datos Fiscales
                    </h3>
                    
                    <FormProvider {...billingMethods}>
                      <Form {...billingMethods}>
                        <form onSubmit={billingMethods.handleSubmit(handlePreSubmit)} className="space-y-6">
                            <BillingForm />
                            
                            <div className="pt-4 flex flex-col gap-3">
                              <Button type="submit" size="lg" className="w-full h-14 font-bold text-base shadow-md hover:shadow-lg transition-all active:scale-[0.98]" disabled={isSubmitting}>
                                  <FileJson className="mr-2 h-5 w-5"/>
                                  Revisar y Generar
                              </Button>
                              
                              <Button type="button" variant="outline" onClick={() => {
                                searchForm.reset();
                                setSearchResult(null);
                                window.history.replaceState({}, '', '/facturar');
                              }} className="w-full h-12">
                                  Volver a buscar otro ticket
                              </Button>
                            </div>
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

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl text-primary">Confirmación de Datos</DialogTitle>
            <DialogDescription>
              Por favor verifica detenidamente que tus datos fiscales sean correctos antes de enviar la solicitud.
            </DialogDescription>
          </DialogHeader>
          {pendingBillingData && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm bg-muted/40 p-4 rounded-xl border border-border/50 shadow-inner">
                <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Razón Social</div>
                <div className="font-semibold truncate">{pendingBillingData.name}</div>
                
                <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">RFC</div>
                <div className="font-semibold uppercase tracking-wide">{pendingBillingData.rfc}</div>
                
                <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">C.P.</div>
                <div className="font-semibold">{pendingBillingData.address.zip}</div>
                
                <div className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Correo</div>
                <div className="font-semibold truncate">{pendingBillingData.email}</div>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 flex gap-3 items-start shadow-sm">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-bold mb-1">Aviso Importante</p>
                  <p className="leading-snug">Una vez generada la factura, cualquier cancelación o re-emisión por errores en los datos proporcionados tendrá un costo administrativo de <strong>$250.00 MXN</strong>.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 pt-1">
                <Checkbox 
                  id="terms" 
                  checked={acceptTerms} 
                  onCheckedChange={(c) => setAcceptTerms(c === true)} 
                  className="mt-1"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Confirmo que mis datos fiscales son correctos y acepto los términos y costos de cancelación.
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)} disabled={isSubmitting}>
              Volver a editar
            </Button>
            <Button 
              disabled={!acceptTerms || isSubmitting} 
              onClick={() => onBillingDataSubmit(pendingBillingData!)}
              className="bg-primary text-white shadow-md font-bold"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileJson className="mr-2 h-4 w-4"/>}
              Generar Factura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withSuspense(PageInner, null);

