
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Save, Printer } from 'lucide-react';
import type { SaleReceipt, WorkshopInfo } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebaseClient.js';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { optimizeImage } from '@/lib/utils';
import { TicketContent } from "@/components/ticket-content";
import { useDebouncedCallback } from 'use-debounce';

import { HeaderLogoCard } from './config-ticket/header-logo-card';
import { InformacionNegocioCard } from './config-ticket/informacion-negocio-card';
import { EstiloTextoTicketCard } from './config-ticket/estilo-texto-ticket-card';
import { MensajesPiePaginaCard } from './config-ticket/mensajes-pie-pagina-card';
import { PieTicketEspaciadoCard } from './config-ticket/pie-ticket-espaciado-card';

const LOCALSTORAGE_KEY = "workshopTicketInfo";

const ticketSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"), nameBold: z.boolean().optional(),
  phone: z.string().min(7, "Mínimo 7 dígitos"), phoneBold: z.boolean().optional(),
  addressLine1: z.string().min(5), addressLine1Bold: z.boolean().optional(),
  addressLine2: z.string().optional(), addressLine2Bold: z.boolean().optional(),
  cityState: z.string().min(3), cityStateBold: z.boolean().optional(),
  logoUrl: z.string().url("Ingresa una URL válida o sube una imagen."),
  logoWidth: z.coerce.number().min(20).max(300).optional(),
  headerFontSize: z.coerce.number().min(8).max(16).optional(),
  bodyFontSize: z.coerce.number().min(8).max(16).optional(),
  itemsFontSize: z.coerce.number().min(8).max(16).optional(),
  totalsFontSize: z.coerce.number().min(8).max(16).optional(),
  footerFontSize: z.coerce.number().min(8).max(16).optional(),
  blankLinesTop: z.coerce.number().min(0).max(10).int().optional(),
  blankLinesBottom: z.coerce.number().min(0).max(10).int().optional(),
  footerLine1: z.string().optional(), footerLine1Bold: z.boolean().optional(),
  footerLine2: z.string().optional(), footerLine2Bold: z.boolean().optional(),
  fixedFooterText: z.string().optional(), fixedFooterTextBold: z.boolean().optional(),
});

type TicketForm = z.infer<typeof ticketSchema>;

const sampleSale: SaleReceipt = {
  id: "PREVIEW-001",
  saleDate: new Date().toISOString(),
  items: [
    { inventoryItemId: "X1", itemName: "Artículo demo 1", quantity: 2, unitPrice: 116, totalPrice: 232 },
    { inventoryItemId: "X2", itemName: "Artículo demo 2", quantity: 1, unitPrice: 58, totalPrice: 58 },
  ],
  subTotal: (232 / 1.16) + (58 / 1.16),
  tax: (232 - 232 / 1.16) + (58 - 58 / 1.16),
  totalAmount: 232 + 58,
  paymentMethod: "Efectivo",
  customerName: "Cliente Demo",
};

const defaultWorkshopInfo: any = {
  name: "RANORO", nameBold: true,
  phone: "4491425323", phoneBold: false,
  addressLine1: "Av. de la Convencion de 1914 No. 1421", addressLine1Bold: false,
  addressLine2: "Jardines de la Concepcion, C.P. 20267", addressLine2Bold: false,
  cityState: "Aguascalientes, Ags.", cityStateBold: false,
  logoUrl: "/ranoro-logo.png",
  logoWidth: 120,
  headerFontSize: 10,
  bodyFontSize: 10,
  itemsFontSize: 10,
  totalsFontSize: 10,
  footerFontSize: 10,
  blankLinesTop: 0,
  blankLinesBottom: 0,
  footerLine1: "¡Gracias por su preferencia!", footerLine1Bold: true,
  footerLine2: "Para dudas o aclaraciones, no dude en contactarnos.", footerLine2Bold: false,
  fixedFooterText: "© 2025 Ranoro® Sistema de Administracion de Talleres. Todos los derechos reservados - Diseñado y Desarrollado por Arturo Valdelamar +524493930914", fixedFooterTextBold: false,
};

export function ConfiguracionTicketPageContent() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const methods = useForm<TicketForm>({ resolver: zodResolver(ticketSchema), defaultValues: defaultWorkshopInfo });
  const watchedValues = methods.watch();

  useEffect(() => {
    const loadSettings = () => {
        const stored = localStorage.getItem(LOCALSTORAGE_KEY);
        if (stored) {
            try {
                methods.reset(JSON.parse(stored) as TicketForm);
            } catch {
                methods.reset(defaultWorkshopInfo);
            }
        }
    };
    loadSettings();

    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === LOCALSTORAGE_KEY) {
            loadSettings();
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [methods]);

  const debouncedSave = useDebouncedCallback((data: TicketForm) => {
      try {
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
        toast({ title: "Configuración guardada", description: "Se actualizó la información del ticket.", duration: 2000 });
      } catch {
        toast({ title: "Error al guardar", variant: "destructive" });
      }
  }, 300);

  const onSubmit = useCallback((data: TicketForm) => debouncedSave(data), [debouncedSave]);

  const handlePrint = useCallback(() => {
    const content = document.querySelector('.ticket-preview-content')?.innerHTML;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Imprimir Ticket</title><link rel="stylesheet" href="/path/to/your/tailwind.css"></head><body>${content}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    };
  }, []);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !storage) return;

    setIsUploading(true);
    toast({ title: 'Subiendo imagen...', description: 'Por favor, espere.' });
    try {
      const optimizedDataUrl = await optimizeImage(file, 300, 0.9);
      const storageRef = ref(storage, `workshop-logos/logo-${Date.now()}.png`);
      await uploadString(storageRef, optimizedDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);
      methods.setValue('logoUrl', downloadURL, { shouldDirty: true, shouldValidate: true });
      toast({ title: '¡Logo actualizado!', description: 'La nueva imagen se ha cargado correctamente.' });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: 'Error al subir', variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  }, [methods, toast]);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1">
          <FormProvider {...methods}>
            <Form {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)} onChange={() => methods.handleSubmit(onSubmit)()} className="space-y-6">
                    <HeaderLogoCard
                      fileInputRef={fileInputRef}
                      isUploading={isUploading}
                      handleImageUpload={handleImageUpload}
                      defaultLogoWidth={defaultWorkshopInfo.logoWidth!}
                    />
                    <InformacionNegocioCard defaultHeaderFontSize={defaultWorkshopInfo.headerFontSize!} />
                    <EstiloTextoTicketCard
                      defaultBodyFontSize={defaultWorkshopInfo.bodyFontSize!}
                      defaultItemsFontSize={defaultWorkshopInfo.itemsFontSize!}
                      defaultTotalsFontSize={defaultWorkshopInfo.totalsFontSize!}
                    />
                    <MensajesPiePaginaCard defaultFooterFontSize={defaultWorkshopInfo.footerFontSize!} />
                    <PieTicketEspaciadoCard />
                    <Button type="submit" className="w-full" disabled={methods.formState.isSubmitting}>
                      <Save className="mr-2 h-4 w-4" />
                      {methods.formState.isSubmitting ? "Guardando…" : "Guardar Cambios"}
                    </Button>
                </form>
            </Form>
          </FormProvider>
        </div>
        <div className="lg:col-span-2">
            <Card className="shadow-lg sticky top-24">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Vista Previa del Ticket</CardTitle>
                        <CardDescription>Así se verá tu ticket impreso.</CardDescription>
                    </div>
                    <Button onClick={handlePrint} variant="outline" aria-label="Imprimir ticket de vista previa">
                      <Printer className="mr-2 h-4 w-4"/>
                      Imprimir
                    </Button>
                </CardHeader>
                <CardContent className="bg-gray-200 dark:bg-gray-800 p-4 sm:p-8 flex justify-center overflow-auto">
                    <div className="ticket-preview-content">
                        <TicketContent sale={sampleSale} previewWorkshopInfo={watchedValues as any} />
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
