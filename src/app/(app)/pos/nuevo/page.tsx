
"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { PosDialog } from "../components/pos-dialog";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { placeholderInventory } from "@/lib/placeholder-data";
import type { SaleReceipt } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

type DialogStep = 'pos' | 'print' | 'closed';

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
    setDialogStep('print'); // Transition to print step
  };

  const handlePosDialogExternalClose = () => { // Called when PosDialog is closed by X or overlay
    if (dialogStep === 'pos') { // Only redirect if it was closed from 'pos' step without completion
      setDialogStep('closed');
    }
  };

  const handlePrintDialogClose = () => {
    setCurrentSaleForTicket(null); // Clear ticket data
    setDialogStep('closed'); // Transition to closed, which will redirect via useEffect
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
          open={true} // Always open when in 'pos' step
          onOpenChange={(isOpen) => { // This is for X button or overlay click
            if (!isOpen) handlePosDialogExternalClose();
          }}
          onSaleComplete={handleSaleCompletion} // This is for form submission
          // onSaleCompleteRedirectPath is not used by this setup, parent handles redirect
        />
      )}

      {dialogStep === 'print' && currentSaleForTicket && (
        <PrintTicketDialog
          open={true} // Always open when in 'print' step
          onOpenChange={(isOpen) => { // This is for X button or overlay click
            if (!isOpen) handlePrintDialogClose();
          }}
          title="Ticket de Venta"
          onDialogClose={handlePrintDialogClose} // Ensure this is also connected for explicit close actions
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

