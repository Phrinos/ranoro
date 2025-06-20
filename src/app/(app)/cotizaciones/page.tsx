
"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../servicios/components/service-dialog"; // Reusing ServiceDialog
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { QuoteContent } from '@/components/quote-content'; // New component for quote PDF
import { placeholderVehicles, placeholderTechnicians, placeholderInventory } from "@/lib/placeholder-data";
import type { QuoteRecord, Vehicle, Technician, ServiceRecord } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

type DialogStep = 'quote_form' | 'print_preview' | 'closed';

export default function NuevaCotizacionPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const technicians = placeholderTechnicians; 
  const inventoryItems = placeholderInventory; 

  const [dialogStep, setDialogStep] = useState<DialogStep>('quote_form');
  const [currentQuoteForPdf, setCurrentQuoteForPdf] = useState<QuoteRecord | null>(null);
  const [currentVehicleForPdf, setCurrentVehicleForPdf] = useState<Vehicle | null>(null);
  const [currentTechnicianForPdf, setCurrentTechnicianForPdf] = useState<Technician | null>(null);

  useEffect(() => {
    if (dialogStep === 'closed') {
      // Decide where to redirect, perhaps to a list of quotes or dashboard
      router.push('/dashboard'); 
    }
  }, [dialogStep, router]);

  // formData here is the QuoteRecord object constructed by ServiceForm
  const handleGenerateQuotePdf = async (formData: QuoteRecord) => { 
    
    // The formData is already a QuoteRecord. We just assign a final ID.
    // All calculations like estimatedSubTotal, estimatedTaxAmount, estimatedTotalSuppliesCost,
    // and estimatedProfit are already done by ServiceForm.
    const newQuote: QuoteRecord = {
      ...formData, // Spread the incoming QuoteRecord
      id: `COT${String(Date.now()).slice(-6)}`, // Assign a new, final ID
      // vehicleIdentifier will come from formData.vehicleIdentifier
      // preparedByTechnicianName will come from formData.preparedByTechnicianName
      // suppliesProposed will come from formData.suppliesProposed
      // estimatedTotalCost, estimatedSubTotal, estimatedTaxAmount, estimatedTotalSuppliesCost, estimatedProfit
      // are all already correctly set in formData by ServiceForm.
    };
    
    // placeholderQuotes.push(newQuote); // If you want to store quotes in memory (optional)

    setCurrentQuoteForPdf(newQuote);
    setCurrentVehicleForPdf(vehicles.find(v => v.id === newQuote.vehicleId) || null);
    setCurrentTechnicianForPdf(technicians.find(t => t.id === newQuote.preparedByTechnicianId) || null);
    
    toast({
      title: "Cotización Lista",
      description: `La cotización ${newQuote.id} está lista para generar el PDF.`,
    });
    
    setDialogStep('print_preview');
  };

  const handleDialogExternalClose = () => { 
     if (dialogStep === 'quote_form') { 
      setDialogStep('closed');
    }
  };

  const handlePrintDialogClose = () => {
    setCurrentQuoteForPdf(null);
    setCurrentVehicleForPdf(null);
    setCurrentTechnicianForPdf(null);
    setDialogStep('closed'); 
  };

  const handleVehicleCreated = (newVehicle: Vehicle) => {
    setVehicles(prev => {
      if (prev.find(v => v.id === newVehicle.id)) return prev; 
      const updatedVehicles = [...prev, newVehicle];
      if (!placeholderVehicles.find(v => v.id === newVehicle.id)) {
         placeholderVehicles.push(newVehicle);
      }
      return updatedVehicles;
    });
  };

  return (
    <>
      <PageHeader
        title="Generar Nueva Cotización"
        description="Complete los detalles para la nueva cotización."
      />
      {dialogStep === 'quote_form' && (
        <ServiceDialog
          open={true}
          onOpenChange={(isOpen) => {
             if (!isOpen) handleDialogExternalClose();
          }}
          quote={null} 
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          // The cast is necessary because ServiceDialog's onSave prop expects (data: ServiceRecord | QuoteRecord)
          // but here we know it will be called with QuoteRecord due to mode="quote".
          onSave={handleGenerateQuotePdf as (data: ServiceRecord | QuoteRecord) => Promise<void>}
          onVehicleCreated={handleVehicleCreated}
          mode="quote" // Set mode to quote
        />
      )}

      {dialogStep === 'print_preview' && currentQuoteForPdf && (
        <PrintTicketDialog
          open={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) handlePrintDialogClose();
          }} 
          title="Vista Previa de Cotización"
          onDialogClose={handlePrintDialogClose}
          autoPrint={false} // User explicitly prints for quotes
        >
          <QuoteContent 
            quote={currentQuoteForPdf} 
            vehicle={currentVehicleForPdf || undefined}
            preparedByTechnician={currentTechnicianForPdf || undefined}
          />
        </PrintTicketDialog>
      )}

      {dialogStep === 'closed' && <p className="text-center text-muted-foreground">Redireccionando...</p>}
    </>
  );
}
