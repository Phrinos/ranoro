
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from 'next/link';
import Image from 'next/image';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Loader2, Search, FileText, FileJson } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { billingService } from '@/lib/services/billing.service';
import type { SaleReceipt, ServiceRecord, WorkshopInfo } from '@/types';
import { BillingForm } from './components/billing-form';
import { billingFormSchema, type BillingFormValues } from './components/billing-schema';
import { createInvoiceAction } from './actions';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const searchSchema = z.object({
  folio: z.string().min(5, "El folio debe tener al menos 5 caracteres.").trim(),
  total: z.coerce.number().min(0.01, "El monto debe ser mayor a cero."),
});

type SearchFormValues = z.infer<typeof searchSchema>;
type TicketType = SaleReceipt | ServiceRecord;

export default function FacturarPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResult, setSearchResult] = useState<TicketType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workshopInfo, setWorkshopInfo] = useState<Partial<WorkshopInfo>>({});

  useEffect(() => {
    const stored = localStorage.getItem('workshopTicketInfo');
    if (stored) {
        try { setWorkshopInfo(JSON.parse(stored)); } catch {}
    }
  }, []);

  const searchForm = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
  });

  const billingMethods = useForm<BillingFormValues>({
    resolver: zodResolver(billingFormSchema),
  });

  const onSearchSubmit = async (data: SearchFormValues) => {
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
  };
  
  const onBillingDataSubmit = async (data: BillingFormValues) => {
    if (!searchResult) return;
    setIsSubmitting(true);
    try {
      const result = await createInvoiceAction(data, searchResult);
      if (result.success) {
        toast({ title: "¡Factura Creada!", description: "La factura ha sido creada y enviada a su correo.", duration: 7000 });
        setSearchResult(null); // Reset form
        searchForm.reset();
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      console.error("Error creating invoice", e);
      toast({ title: "Error al Facturar", description: e.message, variant: "destructive", duration: 7000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const ticketDate = searchResult ? ('saleDate' in searchResult ? searchResult.saleDate : searchResult.serviceDate) : null;

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
          <Button asChild variant="ghost">
            <Link href="/login">¿Eres un taller?</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 py-8 md:py-12 lg:py-16">
        <div className="container mx-auto max-w-xl px-4 md:px-6">
          <Card>
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
                              <Input type="number" step="0.01" placeholder="Ej: 1599.00" {...field} value={field.value ?? ''} />
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
                        <p><strong>Fecha:</strong> {ticketDate ? format(parseISO(ticketDate), "dd MMMM, yyyy", {locale: es}) : 'N/A'}</p>
                        <p><strong>Total:</strong> {formatCurrency('totalAmount' in searchResult ? searchResult.totalAmount : (searchResult.totalCost || 0))}</p>
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
