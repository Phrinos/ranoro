
"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../servicios/components/service-dialog"; // Reusing ServiceDialog
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { QuoteContent } from '@/components/quote-content'; // New component for quote PDF
import { placeholderVehicles, placeholderTechnicians, placeholderInventory } from "@/lib/placeholder-data";
import type { QuoteRecord, Vehicle, Technician, ServiceRecord, ServiceSupply } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns'; // For formatting dates if needed

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

  const handleGenerateQuotePdf = async (formData: any) => { // formData will be ServiceFormValues initially
    
    const IVA_RATE = 0.16;
    const totalSuppliesCostWorkshop = formData.suppliesUsed?.reduce((sum: number, supply: ServiceSupply) => {
        const item = inventoryItems.find(i => i.id === supply.supplyId);
        return sum + (item?.unitPrice || supply.unitPrice || 0) * supply.quantity;
    }, 0) || 0;


    const newQuote: QuoteRecord = {
      id: `COT${String(Date.now()).slice(-6)}`,
      quoteDate: formData.serviceDate.toISOString(), // serviceDate from form is quoteDate here
      vehicleId: formData.vehicleId,
      vehicleIdentifier: vehicles.find(v => v.id === formData.vehicleId)?.licensePlate || formData.vehicleLicensePlateSearch,
      description: formData.description,
      preparedByTechnicianId: formData.technicianId,
      preparedByTechnicianName: technicians.find(t => t.id === formData.technicianId)?.name,
      suppliesProposed: formData.suppliesUsed?.map((s: any) => ({
        supplyId: s.supplyId,
        quantity: s.quantity,
        unitPrice: inventoryItems.find(i => i.id === s.supplyId)?.sellingPrice || s.unitPrice || 0, // Use sellingPrice for quote line items
        supplyName: inventoryItems.find(i => i.id === s.supplyId)?.name || s.supplyName,
      })) || [],
      estimatedTotalCost: Number(formData.totalServicePrice),
      estimatedSubTotal: Number(formData.totalServicePrice) / (1 + IVA_RATE),
      estimatedTaxAmount: Number(formData.totalServicePrice) - (Number(formData.totalServicePrice) / (1 + IVA_RATE)),
      estimatedTotalSuppliesCost: totalSuppliesCostWorkshop, // Cost to workshop
      estimatedProfit: Number(formData.totalServicePrice) - totalSuppliesCostWorkshop,
      notes: formData.notes,
      mileage: formData.mileage,
    };
    
    // placeholderQuotes.push(newQuote); // If you want to store quotes in memory

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
          onSave={handleGenerateQuotePdf as any} // Cast because onSave expects specific types
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
