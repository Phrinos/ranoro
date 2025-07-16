

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
import { Loader2, Copy, Printer, MessageSquare } from 'lucide-react';
import type { InventoryItemFormValues } from '../../inventario/components/inventory-item-form';
import { db } from '@/lib/firebaseClient';
import { writeBatch, doc } from 'firebase/firestore';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { nanoid } from 'nanoid';

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
  'Efectivo', 'Tarjeta', 'Transferencia', 'Efectivo+Transferencia', 'Tarjeta+Transferencia'
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
    const message = `Hola ${saleForTicket.customerName || 'Cliente'}, gracias por tu compra en ${workshopName}.
Folio de Venta: ${saleForTicket.id}
Total: ${formatCurrency(saleForTicket.totalAmount)}

¡Agradecemos tu preferencia!`;

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
  
  const handleCopyAsImage = useCallback(async () => {
    if (!ticketContentRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    try {
      const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: null });
      canvas.toBlob((blob) => {
        if (blob) {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          toast({ title: 'Copiado', description: 'La imagen ha sido copiada.' });
        }
      });
    } catch (e) {
      console.error('Error copying image:', e);
      toast({ title: 'Error', description: 'No se pudo copiar la imagen del ticket.', variant: 'destructive' });
    }
  }, [toast]);
  
  const handlePrint = () => {
    const content = ticketContentRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<div class="printable-content">');
      printWindow.document.write(content.innerHTML);
      printWindow.document.write('</div>');
      
      const stylesheets = Array.from(document.getElementsByTagName('link'));
      stylesheets.forEach(sheet => {
          if (sheet.rel === 'stylesheet' && sheet.href) {
            const link = printWindow.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            printWindow.document.head.appendChild(link);
          }
      });

      const style = printWindow.document.createElement('style');
      style.innerHTML = `
        @media print {
          body * { visibility: hidden; }
          .printable-content, .printable-content * { visibility: visible; }
          .printable-content { position: absolute; left: 0; top: 0; }
        }
      `;
      printWindow.document.head.appendChild(style);

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  if (isLoading) {
      return <div className="text-center p-8 text-muted-foreground flex justify-center items-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando...</div>;
  }

  return (
    <>
      <FormProvider {...methods}>
        <PageHeader
          title="Registrar Nueva Venta"
          description="Complete los artículos y detalles para la nueva venta."
        />
        
        <PosForm
          inventoryItems={currentInventoryItems} 
          onSaleComplete={handleSaleCompletion}
          onInventoryItemCreated={handleNewInventoryItemCreated}
          categories={allCategories}
          suppliers={allSuppliers}
        />
      </FormProvider>

      {saleForTicket && (
        <PrintTicketDialog
          open={isTicketDialogOpen}
          onOpenChange={handleDialogClose}
          title="Venta Completada"
          description={`Ticket para la venta #${saleForTicket.id}`}
          dialogContentClassName="sm:max-w-md"
          footerActions={
            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full justify-end">
              <Button onClick={handleCopySaleForWhatsapp} variant="outline" className="w-full sm:w-auto">
                <MessageSquare className="mr-2 h-4 w-4" /> Copiar para WhatsApp
              </Button>
              <Button variant="outline" onClick={handleCopyAsImage} className="w-full sm:w-auto">
                  <Copy className="mr-2 h-4 w-4"/> Copiar Imagen
              </Button>
              <Button onClick={handlePrint} className="w-full sm:w-auto">
                  <Printer className="mr-2 h-4 w-4"/>Imprimir
              </Button>
            </div>
          }
        >
          <div className="printable-content">
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
