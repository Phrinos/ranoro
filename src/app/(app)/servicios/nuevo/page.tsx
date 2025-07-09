

"use client";

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from "@/components/page-header";
import { ServiceDialog } from "../components/service-dialog";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { TicketContent } from '@/components/ticket-content';
import { ServiceSheetContent } from '@/components/service-sheet-content';
import { placeholderVehicles, placeholderTechnicians, placeholderInventory, placeholderServiceRecords, persistToFirestore } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, WorkshopInfo } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Printer, Copy, MessageSquare } from 'lucide-react';

type DialogStep = 'service' | 'print' | 'sheet' | 'closed';

export default function NuevoServicioPage() {
  const { toast } = useToast(); 
  const router = useRouter();
  const ticketContentRef = useRef<HTMLDivElement>(null);
  const serviceSheetRef = useRef<HTMLDivElement>(null);
  
  const [vehicles, setVehicles] = useState<Vehicle[]>(placeholderVehicles);
  const technicians = placeholderTechnicians; 
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(placeholderInventory);

  const [dialogStep, setDialogStep] = useState<DialogStep>('service');
  const [currentServiceForTicket, setCurrentServiceForTicket] = useState<ServiceRecord | null>(null);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null);
  const [currentTechnician, setCurrentTechnician] = useState<Technician | null>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | {}>({});

  useEffect(() => {
    if (typeof window !== "undefined") {
        const stored = localStorage.getItem('workshopTicketInfo');
        if (stored) setWorkshopInfo(JSON.parse(stored));
    }

    const handleDatabaseUpdate = () => {
      setVehicles([...placeholderVehicles]);
      setInventoryItems([...placeholderInventory]);
    };
    window.addEventListener('databaseUpdated', handleDatabaseUpdate);

    return () => {
      window.removeEventListener('databaseUpdated', handleDatabaseUpdate);
    };
  }, []);

  useEffect(() => {
    if (dialogStep === 'closed') {
      router.push('/servicios/agenda');
    }
  }, [dialogStep, router]);

  const handleSaveNewService = async (data: ServiceRecord) => {
    // Check if the record already exists to avoid duplicates
    const recordIndex = placeholderServiceRecords.findIndex(s => s.id === data.id);
    if (recordIndex > -1) {
      placeholderServiceRecords[recordIndex] = data; // Update
    } else {
      placeholderServiceRecords.push(data); // Add new
    }
    
    await persistToFirestore(['serviceRecords']);
    
    const vehicle = vehicles.find(v => v.id === data.vehicleId);
    const technician = technicians.find(t => t.id === data.technicianId);
    
    setCurrentServiceForTicket(data);
    setCurrentVehicle(vehicle || null);
    setCurrentTechnician(technician || null);

    if (data.status === 'Completado') {
      setDialogStep('print');
    } else if (data.status !== 'Cotizacion') {
      setDialogStep('sheet'); 
    } else {
      // If it's just a quote, close and go back
      handleDialogClose();
    }
  };

  const handleDialogClose = () => {
    setDialogStep('closed');
  };

  const handlePrintTicket = () => {
    window.print();
  };
  
  const handleCopyAsImage = async (ref: React.RefObject<HTMLDivElement>) => {
    if (!ref.current) {
        toast({ title: "Error", description: "No se encontró el contenido para copiar.", variant: "destructive" });
        return;
    }
    try {
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(ref.current, {
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
                    toast({ title: "Copiado", description: "La imagen ha sido copiada." });
                } catch (clipboardErr) {
                    toast({ title: "Error de Copiado", description: "Tu navegador no pudo copiar la imagen.", variant: "destructive" });
                }
            } else {
                 toast({ title: "Error de Conversión", description: "No se pudo convertir a imagen.", variant: "destructive" });
            }
        }, 'image/png');
    } catch (e) {
        toast({ title: "Error de Captura", description: "No se pudo generar la imagen.", variant: "destructive" });
    }
  };
  
  const handleShareService = (service: ServiceRecord | null) => {
    if (!service || !service.publicId) {
      toast({ title: 'Enlace no disponible', description: 'No se ha podido generar el enlace público.', variant: 'default'});
      return;
    }

    const vehicle = vehicles.find(v => v.id === service.vehicleId);
    if (!vehicle) {
        toast({ title: "Faltan Datos", description: "No se encontró el vehículo asociado.", variant: "destructive" });
        return;
    }

    const shareUrl = `${window.location.origin}/s/${service.publicId}`;
    const message = `Hola, ${vehicle.ownerName || 'Cliente'}:

Te invitamos a consultar la hoja de servicio de tu ${vehicle.make} ${vehicle.model} ${vehicle.year}. Puedes revisarla en el siguiente enlace:

${shareUrl}

¡Gracias por confiar en Ranoro!`;

    navigator.clipboard.writeText(message).then(() => {
        toast({ title: 'Mensaje Copiado', description: 'El mensaje para WhatsApp ha sido copiado a tu portapapeles.' });
    }).catch(err => {
        console.error("Could not copy text:", err);
        toast({ title: "Error al Copiar", variant: "destructive" });
    });
  };


  const handleVehicleCreated = (newVehicle: Vehicle) => {
    setVehicles(prev => [...prev, newVehicle]);
  };
  
  const handleInventoryItemCreated = (newItem: InventoryItem) => {
    setInventoryItems(prev => [...prev, newItem]);
  };


  return (
    <>
      <PageHeader
        title="Nuevo Registro"
        description="Crear una nueva cotización o una orden de servicio."
      />
      {dialogStep === 'service' && (
        <ServiceDialog
          open={true}
          onOpenChange={(isOpen) => {
             if (!isOpen) handleDialogClose();
          }}
          service={null} 
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={(data) => handleSaveNewService(data as ServiceRecord)}
          onVehicleCreated={handleVehicleCreated}
          onInventoryItemCreatedFromService={handleInventoryItemCreated}
          mode="service"
        />
      )}
      
      {dialogStep === 'sheet' && currentServiceForTicket && (
        <PrintTicketDialog
          open={true}
          onOpenChange={(isOpen) => !isOpen && handleDialogClose()}
          title="Hoja de Servicio"
          onDialogClose={handleDialogClose}
          dialogContentClassName="printable-quote-dialog"
          footerActions={
            <>
              <Button variant="outline" onClick={() => handleShareService(currentServiceForTicket)}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Copiar para WhatsApp
              </Button>
              <Button onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimir Hoja
              </Button>
            </>
          }
        >
          <ServiceSheetContent
            ref={serviceSheetRef}
            service={currentServiceForTicket}
            vehicle={currentVehicle || undefined}
            workshopInfo={workshopInfo as WorkshopInfo}
          />
        </PrintTicketDialog>
      )}

      {dialogStep === 'print' && currentServiceForTicket && (
        <PrintTicketDialog
          open={true}
          onOpenChange={(isOpen) => !isOpen && handleDialogClose()}
          title="Comprobante de Servicio"
          onDialogClose={handleDialogClose}
          dialogContentClassName="printable-content"
          footerActions={
             <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleCopyAsImage(ticketContentRef)}>
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
            vehicle={currentVehicle || undefined}
            technician={currentTechnician || undefined}
            previewWorkshopInfo={workshopInfo}
          />
        </PrintTicketDialog>
      )}

      {dialogStep === 'closed' && <p className="text-center text-muted-foreground">Redireccionando...</p>}
    </>
  );
}
