

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/page-header';
import { PosForm } from '../components/pos-form';
import type { SaleReceipt, InventoryItem, PaymentMethod, InventoryCategory, Supplier, WorkshopInfo, Vehicle } from '@/types'; 
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { inventoryService, operationsService, messagingService } from '@/lib/services';
import { Loader2, Copy, Printer, MessageSquare } from 'lucide-react';
import type { InventoryItemFormValues } from '../../inventario/components/inventory-item-form';
import { db } from '@/lib/firebaseClient';
import { writeBatch, doc } from 'firebase/firestore';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { Button } from '@/components/ui/button';
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
  
  const sendTicketByWhatsapp = useCallback(async () => {
    if (!ticketContentRef.current || !saleForTicket || !phoneForTicket) return;
    
    const messagingConfigStr = localStorage.getItem('messagingConfig');
    if (!messagingConfigStr) {
        toast({ title: 'Configuración de Mensajería Faltante', description: 'No se ha configurado la API de WhatsApp en Opciones.', variant: 'destructive' });
        return;
    }
    const { apiKey, fromPhoneNumberId } = JSON.parse(messagingConfigStr);
    if (!apiKey || !fromPhoneNumberId) {
        toast({ title: 'Credenciales Faltantes', description: 'API Key y Phone ID son requeridos.', variant: 'destructive' });
        return;
    }

    toast({ title: 'Generando imagen del ticket...' });
    
    // We need a short delay to allow React to render the ticket content in the hidden dialog
    setTimeout(async () => {
        if (!ticketContentRef.current) return;
        const canvas = await html2canvas(ticketContentRef.current, { scale: 2.5, backgroundColor: '#ffffff' });

        toast({ title: 'Enviando ticket por WhatsApp...' });
        const result = await messagingService.sendWhatsappImage(apiKey, fromPhoneNumberId, phoneForTicket, canvas, `Ticket de compra. Folio: ${saleForTicket.id}`);
        
        toast({
            title: result.success ? 'Ticket Enviado' : 'Error al Enviar',
            description: result.message,
            variant: result.success ? 'default' : 'destructive'
        });
    }, 200); // 200ms delay
}, [toast, ticketContentRef, saleForTicket, phoneForTicket]);


  const handleSaleCompletion = async (values: POSFormValues) => {
    if (!db) return;
    const batch = writeBatch(db);
    
    try {
      const saleId = await operationsService.registerSale(values, currentInventoryItems, batch);
      await batch.commit();

      const newSaleReceipt: SaleReceipt = {
        id: saleId,
        saleDate: new Date().toISOString(),
        ...values,
        subTotal: 0, 
        tax: 0,
        totalAmount: values.items.reduce((sum, item) => sum + item.totalPrice, 0),
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
    router.push('/pos');
  };
  
  const handleCopyAsImage = useCallback(async () => {
    if (!ticketContentRef.current) return;
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
      printWindow.document.write('<html><head><title>Imprimir Ticket</title>');
      
      const stylesheets = Array.from(document.getElementsByTagName('link'));
      stylesheets.forEach(sheet => {
          if(sheet.rel === 'stylesheet' && sheet.href) {
            printWindow.document.write(`<link rel="stylesheet" href="${sheet.href}">`);
          }
      });
      
      printWindow.document.write('<style>@media print { body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }</style></head><body class="bg-white">');
      printWindow.document.write('<div class="printable-content">');
      printWindow.document.write(content.innerHTML);
      printWindow.document.write('</div></body></html>');
      
      printWindow.document.close();
      printWindow.focus();
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
              {phoneForTicket && (
                <Button onClick={sendTicketByWhatsapp} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                    <MessageSquare className="mr-2 h-4 w-4" /> Enviar por WhatsApp
                </Button>
              )}
              <Button variant="outline" onClick={handleCopyAsImage} className="w-full sm:w-auto">
                  <Copy className="mr-2 h-4 w-4"/> Copiar Imagen
              </Button>
              <Button onClick={handlePrint} className="w-full sm:w-auto">
                  <Printer className="mr-2 h-4 w-4"/>Imprimir
              </Button>
            </div>
          }
        >
          <TicketContent
            ref={ticketContentRef}
            sale={saleForTicket}
            previewWorkshopInfo={workshopInfo || undefined}
          />
        </PrintTicketDialog>
      )}
    </>
  );
}
