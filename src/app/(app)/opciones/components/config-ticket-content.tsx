// src/app/(app)/opciones/components/config-ticket-content.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Save, Printer } from "lucide-react";
import type { SaleReceipt } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { storage } from "@/lib/firebaseClient.js";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { optimizeImage } from "@/lib/utils";

import { HeaderLogoCard } from "./config-ticket/header-logo-card";
import { InformacionNegocioCard } from "./config-ticket/informacion-negocio-card";
import { EstiloTextoTicketCard } from "./config-ticket/estilo-texto-ticket-card";
import { MensajesPiePaginaCard } from "./config-ticket/mensajes-pie-pagina-card";
import { PieTicketEspaciadoCard } from "./config-ticket/pie-ticket-espaciado-card";
import { TicketContent } from "@/components/ticket-content";
import { useDebouncedCallback } from "use-debounce";
import { defaultTicketSettings } from "@/lib/placeholder-data";

const LOCALSTORAGE_KEY = "workshopTicketInfo";

const isValidLogoUrl = (v: string) => {
  if (!v) return false;
  if (v.startsWith("/")) return true; // ✅ permitido (ruta local)
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

const ticketSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  nameBold: z.boolean().optional(),
  phone: z.string().min(7, "Mínimo 7 dígitos"),
  phoneBold: z.boolean().optional(),
  addressLine1: z.string().min(5),
  addressLine1Bold: z.boolean().optional(),
  addressLine2: z.string().optional(),
  addressLine2Bold: z.boolean().optional(),
  cityState: z.string().min(3),
  cityStateBold: z.boolean().optional(),

  logoUrl: z.string().min(1, "Ingresa una URL o sube una imagen.").refine(isValidLogoUrl, {
    message: "Ingresa una URL válida o sube una imagen.",
  }),

  logoWidth: z.coerce.number().min(20).max(300).optional(),
  headerFontSize: z.coerce.number().min(8).max(16).optional(),
  bodyFontSize: z.coerce.number().min(8).max(16).optional(),
  itemsFontSize: z.coerce.number().min(8).max(16).optional(),
  totalsFontSize: z.coerce.number().min(8).max(16).optional(),
  footerFontSize: z.coerce.number().min(8).max(16).optional(),
  blankLinesTop: z.coerce.number().min(0).max(10).int().optional(),
  blankLinesBottom: z.coerce.number().min(0).max(10).int().optional(),
  footerLine1: z.string().optional(),
  footerLine1Bold: z.boolean().optional(),
  footerLine2: z.string().optional(),
  footerLine2Bold: z.boolean().optional(),
  fixedFooterText: z.string().optional(),
  fixedFooterTextBold: z.boolean().optional(),
});

type TicketFormInput = z.input<typeof ticketSchema>;
type TicketFormValues = z.output<typeof ticketSchema>;

const sampleSale: SaleReceipt = {
  id: "PREVIEW-001",
  saleDate: new Date().toISOString(),
  items: [
    {
      itemId: "X1",
      itemName: "Artículo demo 1",
      quantity: 2,
      unitPrice: 116,
      total: 232,
    },
    {
      itemId: "X2",
      itemName: "Artículo demo 2",
      quantity: 1,
      unitPrice: 58,
      total: 58,
    },
  ],
  subTotal: 232 / 1.16 + 58 / 1.16,
  tax: (232 - 232 / 1.16) + (58 - 58 / 1.16),
  totalAmount: 232 + 58,
  paymentMethod: "Efectivo",
  customerName: "Cliente Demo",
};


export function ConfiguracionTicketPageContent() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const methods = useForm<TicketFormInput, any, TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: defaultTicketSettings as any,
    mode: "onChange",
  });
  const watchedValues = methods.watch();

  useEffect(() => {
    const loadSettings = () => {
      const stored = localStorage.getItem(LOCALSTORAGE_KEY);
      if (stored) {
        try {
          methods.reset(JSON.parse(stored) as any);
        } catch {
          methods.reset(defaultTicketSettings as any);
        }
      }
    };
    loadSettings();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCALSTORAGE_KEY) {
        loadSettings();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [methods]);

  const debouncedSave = useDebouncedCallback((data: TicketFormValues) => {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
      toast({
        title: "Configuración guardada",
        description: "Se actualizó la información del ticket.",
        duration: 2000,
      });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  }, 300);

  const onSubmit = useCallback(
    (data: TicketFormValues) => debouncedSave(data),
    [debouncedSave]
  );

  const handlePrint = useCallback(() => {
    const content = document.querySelector(".ticket-preview-content")?.innerHTML;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(
      `<html><head><title>Imprimir Ticket</title><link rel="stylesheet" href="/path/to/your/tailwind.css"></head><body>${content}</body></html>`
    );
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  }, []);

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !storage) return;

      setIsUploading(true);
      toast({ title: "Subiendo imagen...", description: "Por favor, espere." });
      try {
        const optimizedDataUrl = await optimizeImage(file, 300, 0.9);
        const storageRef = ref(storage, `workshop-logos/logo-${Date.now()}.png`);
        await uploadString(storageRef, optimizedDataUrl, "data_url");
        const downloadURL = await getDownloadURL(storageRef);
        methods.setValue("logoUrl", downloadURL, {
          shouldDirty: true,
          shouldValidate: true,
        });
        toast({
          title: "¡Logo actualizado!",
          description: "La nueva imagen se ha cargado correctamente.",
        });
      } catch (error) {
        console.error("Upload error:", error);
        toast({ title: "Error al subir", variant: "destructive" });
      } finally {
        setIsUploading(false);
      }
    },
    [methods, toast]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-1">
        <FormProvider {...methods}>
          <Form {...methods}>
            <form
              onSubmit={methods.handleSubmit(onSubmit)}
              onChange={() => methods.handleSubmit(onSubmit)()}
              className="space-y-6"
            >
              <HeaderLogoCard
                fileInputRef={fileInputRef}
                isUploading={isUploading}
                handleImageUpload={handleImageUpload}
                defaultLogoWidth={defaultTicketSettings.logoWidth!}
              />
              <InformacionNegocioCard
                defaultHeaderFontSize={defaultTicketSettings.headerFontSize!}
              />
              <EstiloTextoTicketCard
                defaultBodyFontSize={defaultTicketSettings.bodyFontSize!}
                defaultItemsFontSize={defaultTicketSettings.itemsFontSize!}
                defaultTotalsFontSize={defaultTicketSettings.totalsFontSize!}
              />
              <MensajesPiePaginaCard
                defaultFooterFontSize={defaultTicketSettings.footerFontSize!}
              />
              <PieTicketEspaciadoCard />
              <Button
                type="submit"
                className="w-full"
                disabled={methods.formState.isSubmitting}
              >
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
            <Button
              onClick={handlePrint}
              variant="outline"
              aria-label="Imprimir ticket de vista previa"
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </CardHeader>
          <CardContent className="bg-gray-200 dark:bg-gray-800 p-4 sm:p-8 flex justify-center overflow-auto">
            <div className="ticket-preview-content">
              <TicketContent
                sale={sampleSale}
                previewWorkshopInfo={watchedValues as any}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
