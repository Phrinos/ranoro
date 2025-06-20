
"use client";

import { useState, useEffect } from 'react';
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../../servicios/components/service-dialog"; 
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { QuoteContent } from '@/components/quote-content'; 
import { placeholderVehicles, placeholderTechnicians, placeholderInventory, placeholderQuotes } from "@/lib/placeholder-data";
import type { QuoteRecord, Vehicle, Technician, ServiceRecord, User } from "@/types"; // Added User type
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare } from 'lucide-react'; 

type DialogStep = 'quote_form' | 'print_preview' | 'closed';

export default function NuevaCotizacionPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  // Technicians list is not directly used for selection in quote mode anymore
  // const technicians = placeholderTechnicians; 
  const inventoryItems = placeholderInventory; 

  const [dialogStep, setDialogStep] = useState<DialogStep>('quote_form');
  const [currentQuoteForPdf, setCurrentQuoteForPdf] = useState<QuoteRecord | null>(null);
  const [currentVehicleForPdf, setCurrentVehicleForPdf] = useState<Vehicle | null>(null);
  const [currentTechnicianForPdf, setCurrentTechnicianForPdf] = useState<Technician | null>(null); // Will hold preparer info

  // Workshop info for sharing messages - ideally fetched once globally
  const [workshopInfo, setWorkshopInfo] = useState<{name?: string}>({});
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('workshopTicketInfo');
        if (stored) setWorkshopInfo(JSON.parse(stored));
    }
  }, []);


  useEffect(() => {
    if (dialogStep === 'closed') {
      router.push('/cotizaciones/historial'); 
    }
  }, [dialogStep, router]);

  const handleGenerateQuotePdf = async (formData: QuoteRecord) => { 
    
    let authUserName = "Usuario del Sistema";
    let authUserId = "system_user";

    if (typeof window !== 'undefined') {
      const authUserString = localStorage.getItem('authUser');
      if (authUserString) {
        try {
          const authUser: User = JSON.parse(authUserString); 
          authUserName = authUser.name;
          authUserId = authUser.id;
        } catch (e) {
          console.error("Failed to parse authUser for quote preparer:", e);
          // Fallback to default if parsing fails
        }
      }
    }
    
    const newQuote: QuoteRecord = {
      ...formData, 
      id: `COT${String(Date.now()).slice(-6)}`, 
      preparedByTechnicianId: authUserId,
      preparedByTechnicianName: authUserName,
    };
    
    placeholderQuotes.push(newQuote); 

    setCurrentQuoteForPdf(newQuote);
    const vehicleForQuote = vehicles.find(v => v.id === newQuote.vehicleId);
    setCurrentVehicleForPdf(vehicleForQuote || null);
    // Set preparer info from the quote for the PDF content
    setCurrentTechnicianForPdf({ id: newQuote.preparedByTechnicianId!, name: newQuote.preparedByTechnicianName! });
    
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
      `Saludos cordiales,\n${currentQuoteForPdf.preparedByTechnicianName || workshopInfo?.name || 'El equipo del Taller'}` // Use preparer name if available
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
    const phoneNumber = currentVehicleForPdf.ownerPhone.replace(/\D/g, ''); 
    const message = encodeURIComponent(
      `Hola ${currentVehicleForPdf.ownerName || 'Cliente'}, le enviamos su cotización de servicio ${currentQuoteForPdf.id} de ${workshopInfo?.name || 'nuestro taller'} para su vehículo ${currentVehicleForPdf.make} ${currentVehicleForPdf.model} (${currentVehicleForPdf.licensePlate}).\n` +
      `Descripción: ${currentQuoteForPdf.description}\n` +
      `Monto Total Estimado: $${currentQuoteForPdf.estimatedTotalCost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
      `Preparado por: ${currentQuoteForPdf.preparedByTechnicianName || ''}\n` + // Add preparer
      `Puede ver más detalles cuando le enviemos el PDF o lo imprima.`
    );
    const whatsappLink = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappLink, '_blank');
    toast({ title: "Abriendo WhatsApp", description: "Se abrirá WhatsApp para enviar el mensaje." });
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
          technicians={[]} // Pass empty array as technician selector is hidden in quote mode
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
          printButtonText="Imprimir Cotización" 
          dialogContentClassName="printable-quote-dialog" 
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

