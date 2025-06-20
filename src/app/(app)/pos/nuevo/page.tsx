
"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { PosDialog } from "../components/pos-dialog";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { placeholderInventory, placeholderSales } from "@/lib/placeholder-data"; // Added placeholderSales for ID generation
import type { SaleReceipt, Vehicle, Technician, InventoryItem } from '@/types'; 
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

type DialogStep = 'pos' | 'print_preview' | 'closed';

export default function NuevaVentaPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  
  const [currentInventoryItems, setCurrentInventoryItems] = useState<InventoryItem[]>(placeholderInventory); 
  const [dialogStep, setDialogStep] = useState<DialogStep>('pos');
  const [currentSaleForTicket, setCurrentSaleForTicket] = useState<SaleReceipt | null>(null);

  useEffect(() => {
    if (dialogStep === 'closed') {
      router.push('/pos');
    }
  }, [dialogStep, router]);

  const handleSaleCompletion = (saleData: SaleReceipt) => {
    setCurrentSaleForTicket(saleData);
    setDialogStep('print_preview'); // Go directly to print preview
  };

  const handlePosDialogExternalClose = () => { 
     if (dialogStep === 'pos') { 
      setDialogStep('closed');
    }
  };
  
  const handlePrintDialogClose = () => {
    setCurrentSaleForTicket(null); 
    setDialogStep('closed'); 
  };

  const handleInventoryItemCreated = (newItem: InventoryItem) => {
    // Update the global placeholderInventory if it's not already there
    if (!placeholderInventory.find(item => item.id === newItem.id)) {
      placeholderInventory.push(newItem);
    }
    // Update local state for the PosDialog to have the latest items
    setCurrentInventoryItems(prevItems => {
      if (prevItems.find(item => item.id === newItem.id)) return prevItems;
      return [...prevItems, newItem];
    });
  };


  return (
    <>
      <PageHeader
        title="Registrar Nueva Venta"
        description="Complete los artículos y detalles para la nueva venta."
      />
      {dialogStep === 'pos' && (
        <PosDialog
          inventoryItems={currentInventoryItems} // Use state for inventory items
          open={true} 
          onOpenChange={(isOpen) => { 
            if (!isOpen) handlePosDialogExternalClose();
          }}
          onSaleComplete={handleSaleCompletion}
          onInventoryItemCreated={handleInventoryItemCreated} // Handle new items
        />
      )}

      {dialogStep === 'print_preview' && currentSaleForTicket && (
        <PrintTicketDialog
          open={true} 
          onOpenChange={(isOpen) => { 
            if (!isOpen) handlePrintDialogClose();
          }}
          title="Ticket de Venta"
          onDialogClose={handlePrintDialogClose}
          autoPrint={false} // Show preview first, user clicks print
          printButtonText="Imprimir Ticket"
          dialogContentClassName="printable-ticket-dialog"
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

