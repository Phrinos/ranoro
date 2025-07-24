

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/page-header";
import { ServiceForm } from "../components/service-form";
import type { SaleReceipt, InventoryItem, PaymentMethod, InventoryCategory, Supplier, WorkshopInfo, ServiceRecord, Vehicle, Technician, ServiceTypeRecord, QuoteRecord, Personnel } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { inventoryService, operationsService, personnelService } from '@/lib/services';
import { Loader2, Copy, Printer, MessageSquare, Save, X, Share2 } from 'lucide-react';
import type { InventoryItemFormValues } from '../../inventario/components/inventory-item-form';
import { db } from '@/lib/firebaseClient';
import { writeBatch, doc } from 'firebase/firestore';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { nanoid } from 'nanoid';
import { serviceFormSchema } from '@/schemas/service-form';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import type { VehicleFormValues } from '../../vehiculos/components/vehicle-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import html2canvas from 'html2canvas';

// --- Schema Definitions ---
const saleItemSchema = z.object({
  inventoryItemId: z.string().min(1, 'Seleccione un artículo.'),
  itemName: z.string(),
  quantity: z.coerce.number().min(0.001, 'La cantidad debe ser mayor a 0.'),
  unitPrice: z.coerce.number(),
  totalPrice: z.coerce.number(),
  isService: z.boolean().optional(),
  unitType: z.enum(['units', 'ml', 'liters']).optional(),
});

const paymentMethods: [PaymentMethod, ...PaymentMethod[]] = [
  'Efectivo', 'Tarjeta', 'Transferencia', 'Efectivo+Transferencia', 'Tarjeta+Transferencia', 'Efectivo/Tarjeta'
];

const posFormSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'Debe agregar al menos un artículo a la venta.'),
  customerName: z.string().optional(),
  whatsappNumber: z.string().optional(),
  paymentMethod: z.enum(paymentMethods).default('Efectivo'),
  cardFolio: z.string().optional(),
  transferFolio: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.paymentMethod?.includes('Tarjeta') && !data.cardFolio) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'El folio de la tarjeta es obligatorio.',
            path: ['cardFolio'],
        });
    }
    if (data.paymentMethod?.includes('Transferencia') && !data.transferFolio) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'El folio de la transferencia es obligatorio.',
            path: ['transferFolio'],
        });
    }
});

type POSFormValues = z.infer<typeof serviceFormSchema>;

export default function NuevoServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  
  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>([]);
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [serviceForPreview, setServiceForPreview] = useState<ServiceRecord | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);


  const methods = useForm<POSFormValues>({
    resolver: zodResolver(serviceFormSchema),
  });

  useEffect(() => {
    const unsubs = [
      inventoryService.onItemsUpdate(setCurrentInventoryItems),
      inventoryService.onCategoriesUpdate(setAllCategories),
      inventoryService.onSuppliersUpdate(setAllSuppliers),
      inventoryService.onVehiclesUpdate(setVehicles),
      personnelService.onPersonnelUpdate(setPersonnel),
      inventoryService.onServiceTypesUpdate((data) => {
        setServiceTypes(data);
        setIsLoading(false);
      }),
    ];
    
    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handleCopySaleForWhatsapp = useCallback(() => {
    if (!serviceForPreview) return;
    const workshopName = workshopInfo?.name || 'nuestro taller';
    const message = `Hola ${serviceForPreview.customerName || 'Cliente'}, aquí tienes los detalles de tu compra en ${workshopName}.
Folio de Venta: ${serviceForPreview.id}
Total: ${formatCurrency(serviceForPreview.totalCost)}
¡Gracias por tu preferencia!`;

    navigator.clipboard.writeText(message).then(() => {
      toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado.' });
    });
  }, [serviceForPreview, workshopInfo, toast]);


  const handleSaleCompletion = async (values: POSFormValues) => {
    if (!db) return toast({ title: 'Error de base de datos', variant: 'destructive'});
    
    try {
      const savedRecord = await operationsService.saveService(values as ServiceRecord);
      
      toast({ title: 'Registro Creado', description: `El registro #${savedRecord.id} se ha guardado.` });
      
      setServiceForPreview(savedRecord);
      setIsPreviewOpen(true);
      
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Registrar', variant: 'destructive'});
    }
  };
  
  const handleNewInventoryItemCreated = async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem = await inventoryService.addItem(formData);
    return newItem;
  };
  
  const handleDialogClose = () => {
    setIsPreviewOpen(false);
    setServiceForPreview(null);
    methods.reset();
    const targetPath = serviceForPreview?.status === 'Cotizacion' 
                      ? '/cotizaciones/historial' 
                      : '/servicios/historial';
    router.push(targetPath);
  };
  
  const handleCopyAsImage = useCallback(async (isForSharing: boolean = false) => {
    const ticketElement = document.getElementById('printable-ticket-dialog');
    if (!ticketElement || !serviceForPreview) return null;
    try {
      const canvas = await html2canvas(ticketElement, { scale: 2.5, backgroundColor: null });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Could not create blob from canvas.");
      
      if (isForSharing) {
        return new File([blob], `ticket_servicio_${serviceForPreview.id}.png`, { type: 'image/png' });
      } else {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast({ title: "Copiado", description: "La imagen ha sido copiada." });
        return null;
      }
    } catch (e) {
      console.error('Error handling image:', e);
      toast({ title: "Error", description: "No se pudo procesar la imagen del ticket.", variant: "destructive" });
      return null;
    }
  }, [serviceForPreview, toast]);
  
  const handleShare = async () => {
    const imageFile = await handleCopyAsImage(true);
    if (imageFile && navigator.share) {
      try {
        await navigator.share({
          files: [imageFile],
          title: 'Ticket de Servicio',
          text: `Ticket de tu servicio en ${workshopInfo?.name || 'nuestro taller'}.`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        toast({ title: 'Error al compartir', variant: 'destructive' });
      }
    } else {
      handleCopySaleForWhatsapp();
    }
  };

  const handlePrint = () => {
    requestAnimationFrame(() => setTimeout(() => window.print(), 100));
  };
  

  if (isLoading) {
      return <div className="text-center p-8 text-muted-foreground flex justify-center items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando...</div>;
  }

  return (
    <>
      <PageHeader
        title="Nuevo Servicio / Cotización"
        description="Complete la información. El registro se guardará en la base de datos al finalizar."
      />
      
      <FormProvider {...methods}>
        <ServiceForm
          vehicles={vehicles}
          technicians={personnel}
          inventoryItems={currentInventoryItems}
          serviceTypes={serviceTypes}
          onSubmit={handleSaleCompletion}
          onClose={() => router.push('/servicios/historial')}
          mode="quote" // Start as a quote by default
          onVehicleCreated={handleVehicleCreated}
          onTotalCostChange={() => {}} // No-op for this page as total is not displayed in header
        />
        <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/servicios/historial')}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
            </Button>
            <Button
                type="submit"
                form="service-form"
                disabled={methods.formState.isSubmitting}
            >
                {methods.formState.isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Save className="mr-2 h-4 w-4" />
                )}
                Crear Registro
            </Button>
        </div>
      </FormProvider>
      
      {serviceForPreview && (
        <Dialog open={isPreviewOpen} onOpenChange={handleDialogClose}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                  <DialogTitle>Registro Creado con Éxito</DialogTitle>
                  <DialogDescription>
                      El registro #{serviceForPreview.id} ha sido creado. Puedes compartirlo o imprimirlo.
                  </DialogDescription>
              </DialogHeader>
              <div id="printable-ticket-dialog" className="p-4 bg-muted/50 rounded-md">
                <TicketContent
                    service={serviceForPreview}
                    vehicle={vehicles.find(v => v.id === serviceForPreview.vehicleId)}
                    technician={personnel.find(t => t.id === serviceForPreview.technicianId)}
                    previewWorkshopInfo={workshopInfo || undefined}
                />
              </div>
              <DialogFooter>
                  <Button onClick={() => handleCopyAsImage(false)} variant="outline"><Copy className="mr-2 h-4 w-4"/>Copiar</Button>
                  <Button onClick={handleShare}><Share2 className="mr-2 h-4 w-4" /> Compartir</Button>
                  <Button onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
              </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
