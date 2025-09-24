
// src/app/(public)/s/[id]/page.tsx

"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ServiceRecord } from '@/types';
import { ServiceSheetContent } from '@/components/ServiceSheetContent';
import { SignatureDialog } from '@/app/(app)/servicios/components/signature-dialog';
import { AppointmentScheduler } from '@/components/shared/AppointmentScheduler';
import { scheduleAppointmentAction, confirmAppointmentAction, cancelAppointmentAction, saveSignatureAction, getPublicServiceData } from '@/app/(public)/s/actions';
import { UnifiedPreviewDialog } from '@/components/shared/unified-preview-dialog';
import { TicketContent } from '@/components/ticket-content';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function PublicServicePage() {
  const params = useParams();
  const publicId = params.id as string;
  const { toast } = useToast();

  const [service, setService] = useState<ServiceRecord | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  
  const [isSigning, setIsSigning] = useState(false);
  const [signatureType, setSignatureType] = useState<'reception' | 'delivery' | null>(null);

  const [isScheduling, setIsScheduling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const ticketContentRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!publicId) {
      setError("Enlace inválido.");
      setService(null);
      return;
    }

    const fetchServiceData = async () => {
        const { service: fetchedService, error: fetchError } = await getPublicServiceData(publicId);
        
        if (fetchError) {
            setError(fetchError);
            setService(null);
        } else {
            setService(fetchedService);
            setError(null);
        }
    };
    
    fetchServiceData();
    
    // You could optionally set up a realtime listener here if needed,
    // but a one-time fetch is often sufficient for a public page.

  }, [publicId]);

  const handleSaveSignature = async (signatureDataUrl: string) => {
      if (!service || !signatureType) return;
      setIsSigning(true);

      const toastTitle = signatureType === 'reception' ? 'Firma de Recepción Guardada' : 'Firma de Conformidad Guardada';

      const result = await saveSignatureAction(publicId, signatureDataUrl, signatureType);

      if (result.success) {
          toast({ title: toastTitle });
          // Re-fetch data to show the new signature
          const { service: updatedService } = await getPublicServiceData(publicId);
          setService(updatedService);
      } else {
          console.error("Error saving signature:", result.error);
          toast({ title: 'Error al Guardar Firma', description: result.error, variant: 'destructive' });
      }

      setIsSigning(false);
      setSignatureType(null);
  };
    
  const handleConfirmAppointment = async () => {
    if (!service) return;
    setIsConfirming(true);
    try {
      const result = await confirmAppointmentAction(publicId);

      if (!result.success) {
        throw new Error(result.error || 'Error del servidor');
      }
      
      const { service: updatedService } = await getPublicServiceData(publicId);
      setService(updatedService);

      toast({
        title: "Cita Confirmada",
        description: "¡Gracias! Hemos confirmado tu cita.",
      });

    } catch (e: any) {
        toast({
            title: "Error al Confirmar",
            description: e.message || "No se pudo confirmar la cita. Por favor, contacta al taller.",
            variant: "destructive",
        });
    } finally {
        setIsConfirming(false);
    }
  };
  
  const handleSignClick = (type: 'reception' | 'delivery') => {
      setSignatureType(type);
      setIsSigning(true); // Open the dialog by setting isSigning to true
  };

  if (service === undefined) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!service || error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-xl mx-auto text-center"><CardHeader><ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" /><CardTitle className="text-2xl font-bold">Error al Cargar</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">{error || "No se pudo cargar el documento del servicio."}</p></CardContent></Card>
      </div>
    );
  }
  
  return (
     <>
        <div className="container mx-auto py-4 sm:py-8">
            <ServiceSheetContent
              service={service}
              onScheduleClick={() => setIsScheduling(true)}
              onConfirmClick={handleConfirmAppointment}
              isConfirming={isConfirming}
              onSignClick={handleSignClick}
              onShowTicketClick={() => setIsTicketDialogOpen(true)}
              isSigning={isSigning}
              activeTab="order" // Default tab, can be dynamic
            />
        </div>
        
        <SignatureDialog 
            open={isSigning} 
            onOpenChange={(isOpen) => !isOpen && setIsSigning(false)} 
            onSave={handleSaveSignature}
        />
        
        <AppointmentScheduler
            open={isScheduling}
            onOpenChange={setIsScheduling}
            onConfirm={async (selectedDateTime: Date) => {
              if (!service) return;
              
              const result = await scheduleAppointmentAction(publicId, selectedDateTime.toISOString());
              
              if (result.success) {
                  const { service: updatedService } = await getPublicServiceData(publicId);
                  setService(updatedService);
                  toast({
                      title: "Cita Agendada",
                      description: "Tu cita ha sido registrada. Nuestro equipo la confirmará a la brevedad.",
                  });
                  setIsScheduling(false);
              } else {
                  toast({
                      title: "Error al Agendar",
                      description: result.error || "No se pudo agendar la cita. Por favor, inténtelo más tarde.",
                      variant: "destructive",
                  });
              }
            }}
        />

        <UnifiedPreviewDialog
          open={isTicketDialogOpen}
          onOpenChange={setIsTicketDialogOpen}
          title="Ticket de Servicio"
          footerContent={<Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>}
          service={service}
        >
          <TicketContent 
            ref={ticketContentRef}
            service={service}
            vehicle={service.vehicle as any}
            previewWorkshopInfo={service.workshopInfo}
          />
        </UnifiedPreviewDialog>
     </>
  );
}
