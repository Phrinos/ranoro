
"use client";

/*
  ConfiguracionTicketPage – con logoUrl añadido
--------------------------------------------------
  ▸ Agrega el campo obligatorio `logoUrl` para que `TicketContent` reciba la información completa.
  ▸ Formulario incluye entrada para URL del logo.
*/

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, Printer } from "lucide-react";
import type { SaleReceipt } from "@/types";
import { TicketContent } from "@/components/ticket-content";
import { PrintTicketDialog } from "@/components/ui/print-ticket-dialog";


/* ----------------- Datos y validación ----------------- */
const LOCALSTORAGE_KEY = "workshopTicketInfo";

const defaultWorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convención de 1914 No. 1421",
  addressLine2: "Jardines de la Concepción, C.P. 20267",
  cityState: "Aguascalientes, Ags.",
  logoUrl: "/ranoro-logo.png",
};

const ticketSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  phone: z.string().min(7, "Mínimo 7 dígitos"),
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional(),
  cityState: z.string().min(3),
  logoUrl: z.string().url("Ingresa una URL válida"),
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

/* ----------------- Componente ----------------- */
export default function ConfiguracionTicketPage() {
  const { toast } = useToast();
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInfo, setPreviewInfo] = useState<TicketForm>(defaultWorkshopInfo);

  const form = useForm<TicketForm>({
    resolver: zodResolver(ticketSchema),
    defaultValues: defaultWorkshopInfo,
  });

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(LOCALSTORAGE_KEY) : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TicketForm;
        form.reset(parsed);
        setPreviewInfo(parsed);
      } catch {
        form.reset(defaultWorkshopInfo);
      }
    }
  }, [form]);

  const onSubmit = (data: TicketForm) => {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
      toast({ title: "Configuración guardada", description: "Se actualizó la información del ticket" });
      setPreviewInfo(data);
    } catch {
      toast({ title: "Error al guardar", description: "No se pudo escribir en localStorage", variant: "destructive" });
    }
  };

  const handlePreview = () => {
    setPreviewInfo(form.getValues());
    setPreviewOpen(true);
  };
  
  const handlePrint = () => {
    window.print();
  };

  const labels: Record<keyof TicketForm, string> = {
    name: "Nombre del Taller",
    phone: "Teléfono",
    addressLine1: "Dirección (Línea 1)",
    addressLine2: "Dirección (Línea 2 opcional)",
    cityState: "Ciudad, Estado y C.P.",
    logoUrl: "URL del Logo (PNG/JPG)",
  };

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Configuración de Ticket"
        description="Personaliza la información que aparece en los tickets impresos."
      />

      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Información del Taller</CardTitle>
          <CardDescription>Estos datos se mostrarán en la cabecera de cada ticket.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {(Object.keys(labels) as (keyof TicketForm)[]).map((field) => (
                <FormField
                  key={field}
                  control={form.control}
                  name={field}
                  render={({ field: f }) => (
                    <FormItem>
                      <FormLabel>{labels[field]}</FormLabel>
                      <FormControl>
                        <Input {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="button" variant="outline" onClick={handlePreview} className="w-full sm:w-auto">
                  <Eye className="mr-2 h-4 w-4" /> Vista Previa
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
                  <Save className="mr-2 h-4 w-4" /> {form.formState.isSubmitting ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {previewOpen && (
        <PrintTicketDialog 
          open={previewOpen} 
          onOpenChange={setPreviewOpen} 
          title="Vista Previa de Ticket"
          dialogContentClassName="printable-content"
          footerActions={
             <Button onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
          }
        >
          <TicketContent
            ref={ticketContentRef}
            sale={sampleSale}
            previewWorkshopInfo={{
              ...previewInfo,
              addressLine2: previewInfo.addressLine2 ?? "" // asegura string
            }}
          />
        </PrintTicketDialog>
      )}
    </div>
  );
}
