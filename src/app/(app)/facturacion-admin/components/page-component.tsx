
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Save, FileJson, ExternalLink } from 'lucide-react';
import type { WorkshopInfo } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebaseClient.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistorialContent } from './historial-content';

const FIRESTORE_DOC_ID = 'main';

const facturapiSchema = z.object({
  facturapiLiveApiKey: z.string().optional().or(z.literal('')),
  facturapiTestApiKey: z.string().optional().or(z.literal('')),
  facturapiBillingMode: z.enum(['live', 'test']).default('test'),
});

type FacturapiFormValues = z.infer<typeof facturapiSchema>;

function ConfiguracionContent() {
  const { toast } = useToast();
  
  const form = useForm<FacturapiFormValues>({
    resolver: zodResolver(facturapiSchema),
    defaultValues: {
        facturapiLiveApiKey: '',
        facturapiTestApiKey: '',
        facturapiBillingMode: 'test'
    },
  });
  
  useEffect(() => {
    const loadConfig = async () => {
        if (!db) return;
        const configRef = doc(db, 'workshopConfig', FIRESTORE_DOC_ID);
        const docSnap = await getDoc(configRef);
        if (docSnap.exists()) {
            form.reset(docSnap.data());
        }
    };
    loadConfig();
  }, [form]);

  const onSubmit = async (data: FacturapiFormValues) => {
    try {
      if (db) {
        const configRef = doc(db, 'workshopConfig', FIRESTORE_DOC_ID);
        await setDoc(configRef, data, { merge: true });
      }
      toast({ title: 'Configuración guardada', description: 'Se actualizó la configuración de FacturAPI.', duration: 3000 });
    } catch {
      toast({ title: 'Error al guardar', variant: 'destructive', duration: 3000 });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuración de FacturAPI</CardTitle>
            <CardDescription>
              Ingresa tus credenciales de FacturAPI para habilitar la facturación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="facturapiLiveApiKey" render={({ field }) => (<FormItem><FormLabel>Live API Key</FormLabel><FormControl><Input type="password" placeholder="sk_live_..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="facturapiTestApiKey" render={({ field }) => (<FormItem><FormLabel>Test API Key</FormLabel><FormControl><Input type="password" placeholder="sk_test_..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="facturapiBillingMode" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Modo de Facturación</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                        <SelectItem value="test">Pruebas (Test)</SelectItem>
                        <SelectItem value="live">Producción (Live)</SelectItem>
                        </SelectContent>
                    </Select>
                    </FormItem>
                )} />
                <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                  <Save className="mr-2 h-4 w-4" />
                  {form.formState.isSubmitting ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Portal de Auto-Facturación</CardTitle>
            <CardDescription>
              Enlace que puedes compartir con tus clientes para que ellos mismos generen su factura.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center space-y-4 pt-8">
             <div className="p-6 bg-muted/50 rounded-lg">
              <FileJson className="h-16 w-16 text-primary mx-auto" />
            </div>
             <p className="max-w-prose text-muted-foreground">
              Tus clientes pueden ingresar el folio de su ticket (de servicio o venta) y el monto total para generar su factura CFDI 4.0 al instante.
            </p>
            <Button asChild size="lg" className="w-full">
              <Link href="/facturar" target="_blank">
                Ir al Portal de Facturación <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
  );
}


export function FacturacionAdminPageComponent() {
  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
        <p className="text-primary-foreground/80 mt-1">Configura tu conexión con FacturAPI y gestiona tu portal de cliente.</p>
      </div>
      
      <Button asChild size="lg" className="w-full mb-6">
        <Link href="/facturar" target="_blank">
            Ir al Portal Público de Auto-Facturación
            <ExternalLink className="ml-2 h-5 w-5"/>
        </Link>
      </Button>

      <Tabs defaultValue="historial" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="historial">Historial de Facturas</TabsTrigger>
              <TabsTrigger value="configuracion">Configuración</TabsTrigger>
          </TabsList>
          <TabsContent value="historial">
              <HistorialContent />
          </TabsContent>
          <TabsContent value="configuracion">
              <ConfiguracionContent />
          </TabsContent>
      </Tabs>
    </>
  );
}
