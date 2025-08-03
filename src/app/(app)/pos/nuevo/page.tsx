

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from "@/components/page-header";
import { PosForm } from '../components/pos-form';
import type { SaleReceipt, InventoryItem, PaymentMethod, InventoryCategory, Supplier, WorkshopInfo } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { inventoryService, operationsService } from '@/lib/services';
import { Loader2, Copy, Printer, MessageSquare, Save, X, Share2 } from 'lucide-react';
import type { InventoryItemFormValues } from '../../inventario/components/inventory-item-form';
import { db } from '@/lib/firebaseClient';
import { writeBatch, doc } from 'firebase/firestore';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { nanoid } from 'nanoid';
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
  amountInCash: z.coerce.number().optional(),
  amountInCard: z.coerce.number().optional(),
  amountInTransfer: z.coerce.number().optional(),
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

type POSFormValues = z.infer<typeof posFormSchema>;

export default function NuevaVentaPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  
  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>([]);
  const [allCategories, setAllCategories] = useState<InventoryCategory[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [saleForTicket, setSaleForTicket] = useState<SaleReceipt | null>(null);
  const [phoneForTicket, setPhoneForTicket] = useState<string | undefined>(undefined);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);
  const ticketContentRef = useRef<HTMLDivElement>(null);


  const methods = useForm<POSFormValues>({
    resolver: zodResolver(posFormSchema),
    defaultValues: {
      items: [],
      customerName: 'Cliente Mostrador',
      whatsappNumber: '',
      paymentMethod: 'Efectivo',
      cardFolio: '',
      transferFolio: '',
    },
  });

  useEffect(() => {
    const unsubs = [
      inventoryService.onItemsUpdate((items) => {
        setCurrentInventoryItems(items);
        setIsLoading(false);
      }),
      inventoryService.onCategoriesUpdate(setAllCategories),
      inventoryService.onSuppliersUpdate(setAllSuppliers),
    ];
    
    const storedWorkshopInfo = localStorage.getItem('workshopTicketInfo');
    if (storedWorkshopInfo) {
      try { setWorkshopInfo(JSON.parse(storedWorkshopInfo)); } catch (e) { console.error(e); }
    }

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handleCopySaleForWhatsapp = useCallback(() => {
    if (!saleForTicket) return;
    const workshopName = workshopInfo?.name || 'nuestro taller';
    const message = `Hola ${saleForTicket.customerName || 'Cliente'}, aquí tienes los detalles de tu compra en ${workshopName}.
Folio de Venta: ${saleForTicket.id}
Total: ${formatCurrency(saleForTicket.totalAmount)}
¡Gracias por tu preferencia!`;

    navigator.clipboard.writeText(message).then(() => {
      toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado.' });
    });
  }, [saleForTicket, workshopInfo, toast]);


  const handleSaleCompletion = async (values: POSFormValues) => {
    if (!db) return toast({ title: 'Error de base de datos', variant: 'destructive'});

    const batch = writeBatch(db);
    
    try {
      const saleId = `SALE-${nanoid(8).toUpperCase()}`;
      await operationsService.registerSale(saleId, values, currentInventoryItems, batch);
      await batch.commit();

      const totalAmount = values.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const IVA_RATE = 0.16;
      const subTotal = totalAmount / (1 + IVA_RATE);
      const tax = totalAmount - subTotal;

      const newSaleReceipt: SaleReceipt = {
        id: saleId,
        saleDate: new Date().toISOString(),
        ...values,
        subTotal, 
        tax,
        totalAmount,
        status: 'Completado'
      };
      
      toast({ title: 'Venta Registrada', description: `La venta #${saleId} se ha completado.` });
      
      setSaleForTicket(newSaleReceipt);
      setPhoneForTicket(values.whatsappNumber);
      setIsTicketDialogOpen(true); // Open dialog to show ticket and actions
      
    } catch(e) {
      console.error(e);
      toast({ title: 'Error al Registrar Venta', variant: 'destructive'});
    }
  };
  
  const handleNewInventoryItemCreated = async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem = await inventoryService.addItem(formData);
    return newItem;
  };
  
  const handleDialogClose = () => {
    setIsTicketDialogOpen(false);
    setSaleForTicket(null);
    setPhoneForTicket(undefined);
    methods.reset(); // Reset the form for a new sale
    router.push('/pos'); // Navigate to the main POS page
  };
  
  const handleCopyAsImage = useCallback(async (isForSharing: boolean = false) => {
    if (!ticketContentRef.current || !saleForTicket) return null;
    try {
      const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error("Could not create blob from canvas.");
      
      if (isForSharing) {
        return new File([blob], `ticket_${saleForTicket.id}.png`, { type: 'image/png' });
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
  }, [saleForTicket, toast]);
  
  const handleShare = async () => {
    const imageFile = await handleCopyAsImage(true);
    if (imageFile && navigator.share) {
      try {
        await navigator.share({
          files: [imageFile],
          title: 'Ticket de Venta',
          text: `Ticket de tu compra en ${workshopInfo?.name || 'nuestro taller'}.`,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        if(!String(error).includes('AbortError')) {
           toast({ title: 'Error al compartir', variant: 'destructive' });
        }
      }
    } else if (imageFile) {
        // Fallback for desktop browsers that don't support navigator.share with files
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
        title="Registrar Nueva Venta"
        description="Complete los artículos y detalles para la nueva venta."
      />
      
      <FormProvider {...methods}>
        <PosForm
          inventoryItems={currentInventoryItems} 
          onSaleComplete={handleSaleCompletion}
          onInventoryItemCreated={handleNewInventoryItemCreated}
          categories={allCategories}
          suppliers={allSuppliers}
        />
        <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/pos')}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
            </Button>
            <Button
                type="submit"
                form="pos-form"
                disabled={methods.formState.isSubmitting}
            >
                {methods.formState.isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Save className="mr-2 h-4 w-4" />
                )}
                Completar Venta
            </Button>
        </div>
      </FormProvider>

      {saleForTicket && (
        <PrintTicketDialog
          open={isTicketDialogOpen}
          onOpenChange={handleDialogClose}
          title="Venta Completada"
          description={`Ticket para la venta #${saleForTicket.id}`}
          footerActions={<>
              <Button onClick={() => handleCopyAsImage(false)} className="w-full bg-white hover:bg-gray-100 text-black border"><Copy className="mr-2 h-4 w-4"/>Copiar Imagen</Button>
              <Button onClick={handleShare} className="w-full bg-green-100 hover:bg-green-200 text-green-800"><Share2 className="mr-2 h-4 w-4" /> Compartir Ticket</Button>
              <Button onClick={handlePrint} className="w-full"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
          </>}
        >
          <div id="printable-ticket">
            <TicketContent
                ref={ticketContentRef}
                sale={saleForTicket}
                previewWorkshopInfo={workshopInfo || undefined}
            />
          </div>
        </PrintTicketDialog>
      )}
    </>
  );
}
