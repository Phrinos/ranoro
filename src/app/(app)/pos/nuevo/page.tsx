
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

export default function NuevaVentaPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const inventoryItems = placeholderInventory; 
  const [isPosDialogOpen, setIsPosDialogOpen] = useState(true); 
  const [showPrintTicketDialog, setShowPrintTicketDialog] = useState(false);
  const [currentSaleForTicket, setCurrentSaleForTicket] = useState<SaleReceipt | null>(null);

  useEffect(() => {
    setIsPosDialogOpen(true); // Ensure dialog is open when page loads
  }, []);

  const handlePosDialogClose = (isOpen: boolean) => {
    setIsPosDialogOpen(isOpen);
    if (!isOpen && !currentSaleForTicket) { // If POS dialog closed WITHOUT completing a sale
      router.push('/pos'); 
    }
  };

  const handleSaleCompletion = (saleData: SaleReceipt) => {
    setCurrentSaleForTicket(saleData);
    setIsPosDialogOpen(false); // Close POS dialog
    setShowPrintTicketDialog(true); // Open Print dialog
  };
  
  const handlePrintDialogClose = () => {
    setShowPrintTicketDialog(false);
    setCurrentSaleForTicket(null);
    router.push('/pos'); // Redirect after closing print dialog
  };


  return (
    <>
      <PageHeader
        title="Registrar Nueva Venta"
        description="Complete los artículos y detalles para la nueva venta."
      />
      {isPosDialogOpen && (
        <PosDialog
          inventoryItems={inventoryItems}
          open={isPosDialogOpen}
          onOpenChange={handlePosDialogClose}
          onSaleComplete={handleSaleCompletion} 
          onSaleCompleteRedirectPath="/pos" // Fallback, but handled by handleSaleCompletion now
        />
      )}

      {currentSaleForTicket && (
        <PrintTicketDialog
          open={showPrintTicketDialog}
          onOpenChange={setShowPrintTicketDialog}
          title="Ticket de Venta"
          onDialogClose={handlePrintDialogClose}
        >
          <TicketContent sale={currentSaleForTicket} />
        </PrintTicketDialog>
      )}
      
      {!isPosDialogOpen && !showPrintTicketDialog && (
        <div className="text-center p-8">
          <p className="text-muted-foreground">Redireccionando...</p>
        </div>
      )}
    </>
  );
}
