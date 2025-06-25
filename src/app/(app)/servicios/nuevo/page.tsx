
"use client";

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../components/service-dialog";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { placeholderVehicles, placeholderTechnicians, placeholderInventory, placeholderServiceRecords, persistToFirestore, enrichServiceForPrinting } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician, QuoteRecord, InventoryItem } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, Copy } from 'lucide-react';

type DialogStep = 'service' | 'print' | 'closed';

export default function NuevoServicioPage() {
  const { toast } = useToast();
  const router = useRouter();
  const ticketContentRef = useRef<HTMLDivElement>(null);
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const technicians = placeholderTechnicians; 
  const inventoryItems = placeholderInventory; 

  const [dialogStep, setDialogStep] = useState<DialogStep>('service');
  const [currentServiceForTicket, setCurrentServiceForTicket] = useState<ServiceRecord | null>(null);
  const [currentVehicleForTicket, setCurrentVehicleForTicket] = useState<Vehicle | null>(null);
  const [currentTechnicianForTicket, setCurrentTechnicianForTicket] = useState<Technician | null>(null);

  useEffect(() => {
    if (dialogStep === 'closed') {
      router.push('/servicios/historial');
    }
  }, [dialogStep, router]);

  const handleSaveNewService = async (data: ServiceRecord | QuoteRecord) => {
    if (!('status' in data)) {
      toast({
        title: "Error de Tipo",
        description: "Se esperaba un registro de servicio.",
        variant: "destructive",
      });
      return;
    }
    const newService = data as ServiceRecord;
    
    // The form now handles public doc saving. We just update local state.
    placeholderServiceRecords.push(newService); 
    await persistToFirestore(['serviceRecords']);
    
    toast({
      title: "Servicio Creado",
      description: `El nuevo servicio para ${vehicles.find(v => v.id === newService.vehicleId)?.licensePlate} ha sido registrado.`,
    });
    
    if (newService.status === 'Completado') {
      const serviceForTicket = enrichServiceForPrinting(newService, inventoryItems);
      setCurrentServiceForTicket(serviceForTicket);
      setCurrentVehicleForTicket(vehicles.find(v => v.id === newService.vehicleId) || null);
      setCurrentTechnicianForTicket(technicians.find(t => t.id === newService.technicianId) || null);
      setDialogStep('print');
    } else {
      setDialogStep('closed'); 
    }
  };

  const handleServiceDialogExternalClose = () => { 
     if (dialogStep === 'service') { 
      setDialogStep('closed');
    }
  };

  const handlePrintDialogClose = () => {
    setCurrentServiceForTicket(null);
    setCurrentVehicleForTicket(null);
    setCurrentTechnicianForTicket(null);
    setDialogStep('closed'); 
  };

  const handlePrintTicket = () => {
    window.print();
  };
  
  const handleCopyAsImage = async () => {
    if (!ticketContentRef.current) {
        toast({ title: "Error", description: "No se encontró el contenido del ticket.", variant: "destructive" });
        return;
    }
    try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(ticketContentRef.current, {
            useCORS: true,
            backgroundColor: '#ffffff',
            scale: 2.5,
        });
        canvas.toBlob(async (blob) => {
            if (blob) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    toast({ title: "Copiado", description: "La imagen del ticket ha sido copiada." });
                } catch (clipboardErr) {
                    console.error('Clipboard API error:', clipboardErr);
                    toast({ title: "Error de Copiado", description: "Tu navegador no pudo copiar la imagen. Intenta imprimir.", variant: "destructive" });
                }
            } else {
                 toast({ title: "Error de Conversión", description: "No se pudo convertir el ticket a imagen.", variant: "destructive" });
            }
        }, 'image/png');
    } catch (e) {
        console.error("html2canvas error:", e);
        toast({ title: "Error de Captura", description: "No se pudo generar la imagen del ticket.", variant: "destructive" });
    }
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
        title="Registrar Nuevo Servicio"
        description="Complete los detalles para la nueva orden de servicio."
      />
      {dialogStep === 'service' && (
        <ServiceDialog
          open={true}
          onOpenChange={(isOpen) => {
             if (!isOpen) handleServiceDialogExternalClose();
          }}
          service={null} 
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={handleSaveNewService}
          onVehicleCreated={handleVehicleCreated}
          mode="service"
        />
      )}

      {dialogStep === 'print' && currentServiceForTicket && (
        <PrintTicketDialog
          open={true}
          onOpenChange={(isOpen) => {
            if (!isOpen) handlePrintDialogClose();
          }} 
          title="Comprobante de Servicio"
          onDialogClose={handlePrintDialogClose}
          dialogContentClassName="printable-content"
          footerActions={
             <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopyAsImage}>
                    <Copy className="mr-2 h-4 w-4"/> Copiar Imagen
                </Button>
                <Button onClick={handlePrintTicket}>
                    <Printer className="mr-2 h-4 w-4" /> Imprimir Comprobante
                </Button>
             </div>
          }
        >
          <TicketContent 
            ref={ticketContentRef}
            service={currentServiceForTicket} 
            vehicle={currentVehicleForTicket || undefined}
            technician={currentTechnicianForTicket || undefined}
          />
        </PrintTicketDialog>
      )}

      {dialogStep === 'closed' && <p className="text-center text-muted-foreground">Redireccionando...</p>}
    </>
  );
}
