

"use client";

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from "@/components/page-header";
import { PosForm } from "../components/pos-form";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import type { SaleReceipt, InventoryItem, WorkshopInfo } from '@/types'; 
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, Copy } from 'lucide-react';
import { inventoryService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import type { InventoryItemFormValues } from '../../inventario/components/inventory-item-form';


type DialogStep = 'pos' | 'print_preview' | 'closed';

export default function NuevaVentaPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  const ticketContentRef = useRef<HTMLDivElement>(null);
  
  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>([]);
  const [dialogStep, setDialogStep] = useState<DialogStep>('pos');
  const [currentSaleForTicket, setCurrentSaleForTicket] = useState<SaleReceipt | null>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = inventoryService.onItemsUpdate((items) => {
        setCurrentInventoryItems(items);
        setIsLoading(false);
    });
    
    const stored = localStorage.getItem('workshopTicketInfo');
    if (stored) setWorkshopInfo(JSON.parse(stored));

    return () => unsub();
  }, []);

  useEffect(() => {
    if (dialogStep === 'closed') {
      router.push('/pos');
    }
  }, [dialogStep, router]);

  const handleSaleCompletion = (saleData: SaleReceipt) => {
    setCurrentSaleForTicket(saleData);
    setDialogStep('print_preview'); 
  };

  const handlePosDialogExternalClose = () => { 
     if (dialogStep === 'pos') { 
      setDialogStep('closed');
    }
  };
  
  const handlePreviewDialogClose = () => {
    setCurrentSaleForTicket(null); 
    setDialogStep('closed'); 
  };

  const handlePrintTicket = () => {
    window.print();
  };
  
  const handleCopyAsImage = async () => {
    if (!ticketContentRef.current) {
        toast({ title: "Error", description: "No se encontró el contenido del ticket.", variant: "destructive" });
        return;
    }
    const html2canvas = (await import('html2canvas')).default;
    try {
        const canvas = await html2canvas(ticketContentRef.current, {
            useCORS: true,
            backgroundColor: '#ffffff',
            scale: 2.5, 
        });
        canvas.toBlob(async (blob) => {
            if (blob) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    toast({ title: "Copiado", description: "La imagen del ticket ha sido copiada." });
                } catch (clipboardErr) {
                    console.error('Clipboard API error:', clipboardErr);
                    toast({ title: "Error de Copiado", description: "Tu navegador no pudo copiar la imagen. Intenta imprimir.", variant: "destructive" });
                }
            } else {
                 toast({ title: "Error de Conversión", description: "No se pudo convertir el ticket a imagen.", variant: "destructive" });
            }
        }, 'image/png');
    } catch (e) {
        console.error("html2canvas error:", e);
        toast({ title: "Error de Captura", description: "No se pudo generar la imagen del ticket.", variant: "destructive" });
    }
  };

  const handleInventoryItemCreated = async (formData: InventoryItemFormValues): Promise<InventoryItem> => {
    const newItem = await inventoryService.addItem(formData);
    // The main listener in the parent component (`pos/page.tsx`) already handles this
    // via onSnapshot, so we don't need to update local state here.
    return newItem;
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
      {dialogStep === 'pos' && (
        <PosForm
          inventoryItems={currentInventoryItems} 
          onSaleComplete={handleSaleCompletion}
          onInventoryItemCreated={handleInventoryItemCreated}
        />
      )}

      {dialogStep === 'print_preview' && currentSaleForTicket && (
        <PrintTicketDialog
          open={true} 
          onOpenChange={(isOpen) => { 
            if (!isOpen) handlePreviewDialogClose();
          }}
          title="Ticket de Venta"
          onDialogClose={handlePreviewDialogClose}
          dialogContentClassName="printable-content"
          footerActions={
             <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleCopyAsImage}>
                    <Copy className="mr-2 h-4 w-4"/> Copiar Imagen
                </Button>
                <Button onClick={handlePrintTicket}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir Ticket
                </Button>
             </div>
          }
        >
          <TicketContent ref={ticketContentRef} sale={currentSaleForTicket} previewWorkshopInfo={workshopInfo} />
        </PrintTicketDialog>
      )}
      
      {dialogStep === 'closed' && (
        <div className="text-center p-8">
          <p className="text-muted-foreground">Redireccionando...</p>
        </div>
      )}
    </>
  );
}
