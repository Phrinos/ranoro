
"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { PosDialog } from "../components/pos-dialog";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { placeholderInventory } from "@/lib/placeholder-data";
import type { SaleReceipt, Vehicle, Technician } from '@/types'; // Asegúrate de tener Vehicle y Technician si los usas para TicketContent
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
  const { toast } = useToast(); // Toast sigue siendo útil para notificaciones no modales
  const router = useRouter();
  
  const inventoryItems = placeholderInventory; 
  const [dialogStep, setDialogStep] = useState<DialogStep>('pos');
  const [currentSaleForTicket, setCurrentSaleForTicket] = useState<SaleReceipt | null>(null);
  // Si el TicketContent necesita vehicle o technician, necesitarías estados para ellos también.
  // Por ahora, asumimos que SaleReceipt es suficiente para el ticket de venta.

  useEffect(() => {
    if (dialogStep === 'closed') {
      router.push('/pos');
    }
  }, [dialogStep, router]);

  const handleSaleCompletion = (saleData: SaleReceipt) => {
    setCurrentSaleForTicket(saleData);
    // El toast de "Venta Registrada" ya se muestra desde PosForm.
    // Si quisieras un toast específico aquí, podrías añadirlo.
    setDialogStep('confirm_sale'); // Transición al paso de confirmación
  };

  const handlePosDialogExternalClose = () => {
    if (dialogStep === 'pos') { 
      setDialogStep('closed');
    }
  };

  const handleConfirmationDialogClose = () => {
    // Si el usuario cierra el diálogo de confirmación sin proceder (ej. con ESC),
    // decidimos si ir a imprimir o cerrar todo. 
    // Por el requisito de "automáticamente imprimir" tras la confirmación,
    // el flujo principal es a través del botón de acción del AlertDialog.
    // Si se cierra sin acción, podríamos ir a 'closed'.
    // Por simplicidad y para seguir el flujo del botón de acción, no hacemos nada aquí explícitamente
    // a menos que el onOpenChange del AlertDialog lo active.
    // Dejaremos que el botón de acción del AlertDialog maneje la transición a 'print'.
    // Si el AlertDialog se cierra por otra vía (ej. onOpenChange(false)), podría llevar a 'closed'.
    // Esta función puede no ser necesaria si el AlertDialog solo se cierra a través de sus botones.
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
                // Si el diálogo se cierra sin usar el botón de acción (ej. ESC),
                // decidimos el comportamiento. Podría ser cerrar todo e ir a 'closed'.
                if (!isOpen) {
                    setCurrentSaleForTicket(null); // Limpiar datos de venta si se cancela la impresión
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
          autoPrint={true} // Habilitar impresión automática
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

