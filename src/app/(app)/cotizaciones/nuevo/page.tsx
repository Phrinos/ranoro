
"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../../servicios/components/service-dialog"; // Reusing ServiceDialog
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { QuoteContent } from '@/components/quote-content'; 
import { placeholderVehicles, placeholderTechnicians, placeholderInventory, placeholderQuotes } from "@/lib/placeholder-data";
import type { QuoteRecord, Vehicle, Technician, ServiceRecord } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare } from 'lucide-react'; // Icons for sharing

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
      router.push('/dashboard'); // Or perhaps '/cotizaciones/historial'
    }
  }, [dialogStep, router]);

  const handleGenerateQuotePdf = async (formData: QuoteRecord) => { 
    const newQuote: QuoteRecord = {
      ...formData, 
      id: `COT${String(Date.now()).slice(-6)}`, 
    };
    
    placeholderQuotes.push(newQuote); 

    setCurrentQuoteForPdf(newQuote);
    const vehicleForQuote = vehicles.find(v => v.id === newQuote.vehicleId);
    setCurrentVehicleForPdf(vehicleForQuote || null);
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

  const handleSendEmail = () => {
    if (!currentQuoteForPdf || !currentVehicleForPdf) return;
    const subject = encodeURIComponent(`Cotización de Servicio: ${currentQuoteForPdf.id} - ${workshopInfo?.name || 'Su Taller'}`);
    const body = encodeURIComponent(
      `Estimado/a ${currentVehicleForPdf.ownerName || 'Cliente'},\n\n` +
      `Le adjuntamos la cotización ${currentQuoteForPdf.id} para su vehículo ${currentVehicleForPdf.make} ${currentVehicleForPdf.model} (${currentVehicleForPdf.licensePlate}).\n\n` +
      `Descripción: ${currentQuoteForPdf.description}\n` +
      `Monto Total Estimado: $${currentQuoteForPdf.estimatedTotalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
      `Por favor, revise el PDF adjunto para más detalles o imprima la cotización desde la vista previa.\n\n` +
      `Saludos cordiales,\n${workshopInfo?.name || 'El equipo del Taller'}`
    );
    const mailtoLink = `mailto:${currentVehicleForPdf.ownerEmail || ''}?subject=${subject}&body=${body}`;
    window.open(mailtoLink, '_blank');
    toast({ title: "Preparando Email", description: "Se abrirá su cliente de correo. Considere adjuntar el PDF generado." });
  };

  const handleSendWhatsApp = () => {
    if (!currentQuoteForPdf || !currentVehicleForPdf || !currentVehicleForPdf.ownerPhone) {
      toast({ title: "Faltan Datos", description: "No se encontró el teléfono del cliente para enviar por WhatsApp.", variant: "destructive" });
      return;
    }
    const phoneNumber = currentVehicleForPdf.ownerPhone.replace(/\D/g, ''); // Remove non-digits
    const message = encodeURIComponent(
      `Hola ${currentVehicleForPdf.ownerName || 'Cliente'}, le enviamos su cotización de servicio ${currentQuoteForPdf.id} de ${workshopInfo?.name || 'nuestro taller'} para su vehículo ${currentVehicleForPdf.make} ${currentVehicleForPdf.model} (${currentVehicleForPdf.licensePlate}).\n` +
      `Descripción: ${currentQuoteForPdf.description}\n` +
      `Monto Total Estimado: $${currentQuoteForPdf.estimatedTotalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
      `Puede ver más detalles cuando le enviemos el PDF o lo imprima.`
    );
    const whatsappLink = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappLink, '_blank');
    toast({ title: "Abriendo WhatsApp", description: "Se abrirá WhatsApp para enviar el mensaje." });
  };
  
  // Workshop info for sharing messages - ideally fetched once globally
  const [workshopInfo, setWorkshopInfo] = useState<{name?: string}>({});
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('workshopTicketInfo');
        if (stored) setWorkshopInfo(JSON.parse(stored));
    }
  }, []);


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
          onSave={handleGenerateQuotePdf as (data: ServiceRecord | QuoteRecord) => Promise<void>}
          onVehicleCreated={handleVehicleCreated}
          mode="quote" 
        />
      )}

      {dialogStep === 'print_preview' && currentQuoteForPdf && (
        <PrintTicketDialog
          open={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) handlePrintDialogClose();
          }} 
          title="Vista Previa de Cotización"
          printButtonText="Imprimir Cotización" // Custom print button text
          dialogContentClassName="printable-quote-dialog" // Class for letter size print styling
          onDialogClose={handlePrintDialogClose}
          autoPrint={false} 
        >
          <QuoteContent 
            quote={currentQuoteForPdf} 
            vehicle={currentVehicleForPdf || undefined}
            preparedByTechnician={currentTechnicianForPdf || undefined}
          />
          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center print-hidden border-t pt-4">
            <Button variant="outline" onClick={handleSendEmail} disabled={!currentVehicleForPdf?.ownerEmail}>
              <Mail className="mr-2 h-4 w-4" /> Enviar por Email
            </Button>
            <Button variant="outline" onClick={handleSendWhatsApp} disabled={!currentVehicleForPdf?.ownerPhone}>
              <MessageSquare className="mr-2 h-4 w-4" /> Enviar por WhatsApp
            </Button>
          </div>
        </PrintTicketDialog>
      )}

      {dialogStep === 'closed' && <p className="text-center text-muted-foreground">Redireccionando...</p>}
    </>
  );
}

