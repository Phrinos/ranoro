
"use client";

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../../servicios/components/service-dialog"; 
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { QuoteContent } from '@/components/quote-content'; 
import { placeholderVehicles, placeholderTechnicians, placeholderInventory, placeholderQuotes } from "@/lib/placeholder-data";
import type { QuoteRecord, Vehicle, Technician, ServiceRecord, User, InventoryItem } from "@/types"; 
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare } from 'lucide-react'; 
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type DialogStep = 'quote_form' | 'print_preview' | 'closed';

export default function NuevaCotizacionPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const inventoryItems = placeholderInventory; 

  const [dialogStep, setDialogStep] = useState<DialogStep>('quote_form');
  const [currentQuoteForPdf, setCurrentQuoteForPdf] = useState<QuoteRecord | null>(null);
  const [currentVehicleForPdf, setCurrentVehicleForPdf] = useState<Vehicle | null>(null);
  const quoteContentRef = useRef<HTMLDivElement>(null);

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

  const handleGenerateQuotePdf = async (data: ServiceRecord | QuoteRecord) => { 
    if (!('estimatedTotalCost' in data)) { // Check if it's a QuoteRecord
      toast({
        title: "Error de Tipo",
        description: "Se esperaba un registro de cotización.",
        variant: "destructive",
      });
      return;
    }
    const formData = data as QuoteRecord;
    
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

  const generatePdf = async () => {
    if (!quoteContentRef.current) {
        toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
        return null;
    }
    const canvas = await html2canvas(quoteContentRef.current, { scale: 3 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'letter');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    const imgPdfWidth = pdfWidth;
    const imgPdfHeight = imgPdfWidth / ratio;
    
    let heightLeft = imgPdfHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgPdfWidth, imgPdfHeight);
    heightLeft -= pdfHeight;
    
    while (heightLeft > 0) {
        position = heightLeft - imgPdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgPdfWidth, imgPdfHeight);
        heightLeft -= pdfHeight;
    }
    return pdf;
  };

  const handleSendEmail = async () => {
    if (!currentQuoteForPdf || !currentVehicleForPdf) return;
    const pdf = await generatePdf();
    if(pdf) {
        pdf.save(`Cotizacion-${currentQuoteForPdf.id}.pdf`);
        toast({ title: "PDF Descargado", description: "El PDF de la cotización ha sido descargado. Por favor, adjúntalo manualmente a tu correo." });

        const subject = encodeURIComponent(`Cotización de Servicio: ${currentQuoteForPdf.id} - ${workshopInfo?.name || 'Su Taller'}`);
        const body = encodeURIComponent(
        `Estimado/a ${currentVehicleForPdf.ownerName || 'Cliente'},\n\n` +
        `Adjunto encontrará la cotización de servicio solicitada.\n\n`+
        `Saludos cordiales,\n${currentQuoteForPdf.preparedByTechnicianName || workshopInfo?.name || 'El equipo del Taller'}`
        );
        const mailtoLink = `mailto:${currentVehicleForPdf.ownerEmail || ''}?subject=${subject}&body=${body}`;
        window.open(mailtoLink, '_blank');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!currentQuoteForPdf || !currentVehicleForPdf || !currentVehicleForPdf.ownerPhone) {
      toast({ title: "Faltan Datos", description: "No se encontró el teléfono del cliente para enviar por WhatsApp.", variant: "destructive" });
      return;
    }
    const pdf = await generatePdf();
    if(pdf) {
        pdf.save(`Cotizacion-${currentQuoteForPdf.id}.pdf`);
        toast({ title: "PDF Descargado", description: "El PDF de la cotización ha sido descargado. Por favor, adjúntalo manualmente a tu conversación de WhatsApp." });
    
        const phoneNumber = currentVehicleForPdf.ownerPhone.replace(/\D/g, ''); 
        const message = encodeURIComponent(
        `Hola ${currentVehicleForPdf.ownerName || 'Cliente'}, le enviamos su cotización de servicio ${currentQuoteForPdf.id} de ${workshopInfo?.name || 'nuestro taller'} para su vehículo ${currentVehicleForPdf.make} ${currentVehicleForPdf.model}. Le hemos enviado el PDF a su dispositivo para que pueda adjuntarlo.`
        );
        const whatsappLink = `https://wa.me/${phoneNumber}?text=${message}`;
        window.open(whatsappLink, '_blank');
    }
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
          technicians={[]} 
          inventoryItems={inventoryItems}
          onSave={handleGenerateQuotePdf}
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
          footerActions={
             <>
                <Button variant="outline" onClick={handleSendEmail} disabled={!currentVehicleForPdf?.ownerEmail}>
                    <Mail className="mr-2 h-4 w-4" /> Enviar por Email
                </Button>
                <Button variant="outline" onClick={handleSendWhatsApp} disabled={!currentVehicleForPdf?.ownerPhone}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Enviar por WhatsApp
                </Button>
             </>
          }
        >
          <QuoteContent 
            ref={quoteContentRef}
            quote={currentQuoteForPdf} 
            vehicle={currentVehicleForPdf || undefined}
          />
        </PrintTicketDialog>
      )}

      {dialogStep === 'closed' && <p className="text-center text-muted-foreground">Redireccionando...</p>}
    </>
  );
}
