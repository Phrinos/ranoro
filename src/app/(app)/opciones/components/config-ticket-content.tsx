
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Upload, Loader2, Bold, Printer } from 'lucide-react';
import type { SaleReceipt, WorkshopInfo } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebaseClient.js';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { optimizeImage } from '@/lib/utils';
import { TicketContent } from "@/components/ticket-content";

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

const defaultWorkshopInfo: WorkshopInfo = {
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
  fixedFooterText: "Sistema de Administración de Talleres Ranoro®\nDiseñado y Desarrollado por Arturo Valdelamar", fixedFooterTextBold: false,
};

const TextFieldWithBoldness = ({ name, label, control, isTextarea = false }: { name: keyof TicketForm; label: string; control: any; isTextarea?: boolean }) => (
    <FormField control={control} name={name} render={({ field }) => (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="flex items-center gap-2">
                <FormControl>{isTextarea ? <Textarea {...field} /> : <Input {...field} />}</FormControl>
                <FormField control={control} name={`${name}Bold` as any} render={({ field: boldField }) => (
                    <FormItem className="flex items-center space-x-1.5 space-y-0" title="Negrita">
                        <FormControl><Checkbox checked={boldField.value} onCheckedChange={boldField.onChange} /></FormControl>
                        <Bold className="h-4 w-4" />
                    </FormItem>
                )}/>
            </div>
             <FormMessage />
        </FormItem>
    )}/>
);

export function ConfiguracionTicketPageContent() {
  const { toast } = useToast();
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<TicketForm>({ resolver: zodResolver(ticketSchema), defaultValues: defaultWorkshopInfo });
  const watchedValues = form.watch();

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(LOCALSTORAGE_KEY) : null;
    if (stored) {
      try {
        form.reset(JSON.parse(stored) as TicketForm);
      } catch {
        form.reset(defaultWorkshopInfo);
      }
    }
  }, [form]);

  const onSubmit = (data: TicketForm) => {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
      toast({ title: "Configuración guardada", description: "Se actualizó la información del ticket", duration: 3000 });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive", duration: 3000 });
    }
  };
  
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Imprimir Ticket</title><style>@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .printable-content { margin: 0; padding: 0; } }</style></head><body>');
      const printableContent = document.getElementById('ticket-preview-printable');
      if (printableContent) printWindow.document.write(printableContent.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!storage) return toast({ title: "Error de Configuración", variant: "destructive" });
    setIsUploading(true);
    toast({ title: 'Subiendo imagen...', description: 'Por favor, espere.' });
    try {
      const optimizedDataUrl = await optimizeImage(file, 300, 0.9);
      const storageRef = ref(storage, `workshop-logos/logo-${Date.now()}.png`);
      await uploadString(storageRef, optimizedDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);
      form.setValue('logoUrl', downloadURL, { shouldDirty: true });
      toast({ title: '¡Logo actualizado!', description: 'La nueva imagen se ha cargado correctamente.' });
    } catch (error) {
      toast({ title: 'Error al subir', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Card><CardHeader><CardTitle>Encabezado y Logo</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="blankLinesTop" render={({ field }) => (<FormItem><FormLabel>Líneas en Blanco (Arriba)</FormLabel><FormControl><Input type="number" min={0} max={10} {...field} value={field.value || 0} /></FormControl></FormItem>)}/><FormItem><FormLabel>Subir Logo</FormLabel><Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>{isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4" />}{isUploading ? "Subiendo..." : "Seleccionar Imagen"}</Button><input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} /><FormDescription>El logo actual se mostrará en la vista previa.</FormDescription></FormItem><FormField control={form.control} name="logoWidth" render={({ field }) => (<FormItem><FormLabel>Ancho del Logo: {field.value || defaultWorkshopInfo.logoWidth}px</FormLabel><FormControl><Slider value={[field.value || defaultWorkshopInfo.logoWidth || 120]} onValueChange={(value) => field.onChange(value[0])} min={40} max={250} step={5} /></FormControl></FormItem>)}/></CardContent></Card>
                    <Card><CardHeader><CardTitle>Información del Negocio</CardTitle></CardHeader><CardContent className="space-y-4"><TextFieldWithBoldness name="name" label="Nombre del Taller" control={form.control} /><TextFieldWithBoldness name="phone" label="Teléfono" control={form.control} /><TextFieldWithBoldness name="addressLine1" label="Dirección (Línea 1)" control={form.control} /><TextFieldWithBoldness name="addressLine2" label="Dirección (Línea 2)" control={form.control} /><TextFieldWithBoldness name="cityState" label="Ciudad, Estado, C.P." control={form.control} /><FormField control={form.control} name="headerFontSize" render={({ field }) => (<FormItem><FormLabel>Tamaño Fuente (Encabezado): {field.value || defaultWorkshopInfo.headerFontSize}px</FormLabel><FormControl><Slider value={[field.value || defaultWorkshopInfo.headerFontSize || 10]} onValueChange={(value) => field.onChange(value[0])} min={8} max={16} step={1} /></FormControl></FormItem>)}/></CardContent></Card>
                    <Card><CardHeader><CardTitle>Estilo del Texto del Ticket</CardTitle></CardHeader><CardContent className="space-y-4"><FormField control={form.control} name="bodyFontSize" render={({ field }) => (<FormItem><FormLabel>Tamaño Fuente (Cuerpo): {field.value || defaultWorkshopInfo.bodyFontSize}px</FormLabel><FormControl><Slider value={[field.value || defaultWorkshopInfo.bodyFontSize || 10]} onValueChange={(value) => field.onChange(value[0])} min={8} max={16} step={1} /></FormControl></FormItem>)}/><FormField control={form.control} name="itemsFontSize" render={({ field }) => (<FormItem><FormLabel>Tamaño Fuente (Artículos): {field.value || defaultWorkshopInfo.itemsFontSize}px</FormLabel><FormControl><Slider value={[field.value || defaultWorkshopInfo.itemsFontSize || 10]} onValueChange={(value) => field.onChange(value[0])} min={8} max={16} step={1} /></FormControl></FormItem>)}/><FormField control={form.control} name="totalsFontSize" render={({ field }) => (<FormItem><FormLabel>Tamaño Fuente (Totales): {field.value || defaultWorkshopInfo.totalsFontSize}px</FormLabel><FormControl><Slider value={[field.value || defaultWorkshopInfo.totalsFontSize || 10]} onValueChange={(value) => field.onChange(value[0])} min={8} max={16} step={1} /></FormControl></FormItem>)}/></CardContent></Card>
                    <Card><CardHeader><CardTitle>Mensajes de Pie de Página</CardTitle></CardHeader><CardContent className="space-y-4"><TextFieldWithBoldness name="footerLine1" label="Línea de Agradecimiento" control={form.control} /><TextFieldWithBoldness name="footerLine2" label="Línea de Contacto" control={form.control} /><FormField control={form.control} name="footerFontSize" render={({ field }) => (<FormItem><FormLabel>Tamaño Fuente (Pie): {field.value || defaultWorkshopInfo.footerFontSize}px</FormLabel><FormControl><Slider value={[field.value || defaultWorkshopInfo.footerFontSize || 10]} onValueChange={(value) => field.onChange(value[0])} min={8} max={16} step={1} /></FormControl></FormItem>)}/></CardContent></Card>
                    <Card><CardHeader><CardTitle>Pie de Ticket y Espaciado Final</CardTitle></CardHeader><CardContent className="space-y-4"><TextFieldWithBoldness name="fixedFooterText" label="Texto Final" control={form.control} isTextarea /><FormField control={form.control} name="blankLinesBottom" render={({ field }) => (<FormItem><FormLabel>Líneas en Blanco (Abajo)</FormLabel><FormControl><Input type="number" min={0} max={10} {...field} value={field.value || 0}/></FormControl></FormItem>)}/></CardContent></Card>
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}><Save className="mr-2 h-4 w-4" />{form.formState.isSubmitting ? "Guardando…" : "Guardar Cambios"}</Button>
                </form>
            </Form>
        </div>
        <div className="lg:col-span-2"><Card className="shadow-lg sticky top-24"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Vista Previa del Ticket</CardTitle><CardDescription>Así se verá tu ticket impreso.</CardDescription></div><Button onClick={handlePrint} variant="outline"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button></CardHeader><CardContent className="bg-gray-200 dark:bg-gray-800 p-4 sm:p-8 flex justify-center overflow-auto"><div id="ticket-preview-printable" className="w-[300px] bg-white shadow-lg"><TicketContent ref={ticketContentRef} sale={sampleSale} previewWorkshopInfo={watchedValues as WorkshopInfo} /></div></CardContent></Card></div>
    </div>
  );
}
