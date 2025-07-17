
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Search, FileText } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';

const searchSchema = z.object({
  folio: z.string().min(5, "El folio debe tener al menos 5 caracteres."),
  total: z.coerce.number().min(0.01, "El monto debe ser mayor a cero."),
});

type SearchFormValues = z.infer<typeof searchSchema>;

export default function FacturarPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null); // Replace 'any' with your ticket type
  const [error, setError] = useState<string | null>(null);

  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
  });

  const onSearchSubmit = (data: SearchFormValues) => {
    setIsLoading(true);
    setError(null);
    setSearchResult(null);
    
    // Simulate API call
    setTimeout(() => {
      // TODO: Replace with actual API call to your backend
      // Your backend would then query the 'serviceRecords' or 'sales' collection
      
      // Example of a failed search
      if (data.folio.toLowerCase().includes("fail")) {
        setError("No se encontró ningún ticket con la información proporcionada. Por favor, verifique el folio y el monto.");
      } else {
        // Example of a successful search
        setSearchResult({
          folio: data.folio,
          total: data.total,
          date: new Date().toISOString(),
          description: "Cambio de aceite y filtro de aire",
        });
      }
      setIsLoading(false);
    }, 1500);
  };
  
  // TODO: Create the form for client fiscal data capture
  const onBillingDataSubmit = (data: any) => {
    console.log("Billing data submitted:", data);
    toast({ title: "Factura Solicitada", description: "Enviaremos la factura a tu correo electrónico en breve." });
  };


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
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSearchSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="folio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Folio del Ticket</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: SALE-ABC123XYZ" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="total"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monto Total (con IVA)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="Ej: 1599.00" {...field} />
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
              ) : (
                <div className="space-y-6">
                   <Alert variant="default" className="border-green-500 bg-green-50">
                      <FileText className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-700">Ticket Encontrado</AlertTitle>
                      <AlertDescription>
                        <p><strong>Folio:</strong> {searchResult.folio}</p>
                        <p><strong>Descripción:</strong> {searchResult.description}</p>
                      </AlertDescription>
                  </Alert>

                  <h3 className="text-lg font-semibold border-t pt-4">Ingresa tus Datos Fiscales</h3>
                  {/* Placeholder for the actual billing form */}
                  <div className="text-center p-8 border-dashed border-2 rounded-md">
                    <p className="text-muted-foreground">El formulario para ingresar los datos del cliente para la facturación irá aquí.</p>
                     <Button className="mt-4" disabled>Generar Factura (Próximamente)</Button>
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

