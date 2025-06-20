
"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { PosDialog } from "../components/pos-dialog";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { placeholderInventory } from "@/lib/placeholder-data";
import type { SaleReceipt, Vehicle, Technician } from '@/types'; 
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DialogStep = 'pos' | 'confirm_sale' | 'print' | 'closed';

export default function NuevaVentaPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  
  const inventoryItems = placeholderInventory; 
  const [dialogStep, setDialogStep] = useState<DialogStep>('pos');
  const [currentSaleForTicket, setCurrentSaleForTicket] = useState<SaleReceipt | null>(null);

  useEffect(() => {
    if (dialogStep === 'closed') {
      router.push('/pos');
    }
  }, [dialogStep, router]);

  const handleSaleCompletion = (saleData: SaleReceipt) => {
    setCurrentSaleForTicket(saleData);
    // Toast for "Venta Registrada" is shown from PosForm.
    setDialogStep('confirm_sale'); 
  };

  const handlePosDialogExternalClose = () => { 
     if (dialogStep === 'pos') { 
      setDialogStep('closed');
    }
  };
  
  const handleProceedToPrint = () => {
    setDialogStep('print');
  };

  const handlePrintDialogClose = () => {
    setCurrentSaleForTicket(null); 
    setDialogStep('closed'); 
  };


  return (
    <>
      <PageHeader
        title="Registrar Nueva Venta"
        description="Complete los artículos y detalles para la nueva venta."
      />
      {dialogStep === 'pos' && (
        <PosDialog
          inventoryItems={inventoryItems}
          open={true} 
          onOpenChange={(isOpen) => { 
            if (!isOpen) handlePosDialogExternalClose();
          }}
          onSaleComplete={handleSaleCompletion}
        />
      )}

      {dialogStep === 'confirm_sale' && currentSaleForTicket && (
        <AlertDialog 
            open={true} 
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setCurrentSaleForTicket(null); 
                    setDialogStep('closed');
                }
            }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Venta Registrada Exitosamente</AlertDialogTitle>
              <AlertDialogDescription>
                La venta con ID <span className="font-semibold">{currentSaleForTicket.id}</span> por un total de <span className="font-semibold">${currentSaleForTicket.totalAmount.toLocaleString('es-MX', {minimumFractionDigits: 2})}</span> ha sido procesada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={handleProceedToPrint}>
                Proceder a Imprimir Ticket
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {dialogStep === 'print' && currentSaleForTicket && (
        <PrintTicketDialog
          open={true} 
          onOpenChange={(isOpen) => { 
            if (!isOpen) handlePrintDialogClose();
          }}
          title="Ticket de Venta"
          onDialogClose={handlePrintDialogClose}
          autoPrint={true} 
        >
          <TicketContent sale={currentSaleForTicket} />
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

