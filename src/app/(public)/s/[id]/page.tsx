
// src/app/(public)/s/[id]/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebasePublic.js';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ServiceRecord, Vehicle, WorkshopInfo } from '@/types';
import { savePublicDocument } from '@/lib/public-document';
import { QuoteSheetContent } from '@/components/QuoteSheetContent';
import { SignatureDialog } from '@/app/(app)/servicios/components/signature-dialog';
import { AppointmentScheduler } from '@/components/shared/AppointmentScheduler';
import { scheduleAppointmentAction } from '@/app/(public)/s/actions';

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


  useEffect(() => {
    if (!publicId || !db) {
      setError("Enlace inválido o la base de datos no está disponible.");
      setService(null);
      return;
    }
    const docRef = doc(db, 'publicServices', publicId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            setService(docSnap.data() as ServiceRecord);
            setError(null);
        } else {
            setError(`El documento con ID "${publicId}" no fue encontrado.`);
            setService(null);
        }
    }, (err) => {
        console.error("Error fetching public service:", err);
        setError("Ocurrió un error al cargar el documento.");
        setService(null);
    });

    return () => unsubscribe();
  }, [publicId]);

  const handleSaveSignature = async (signatureDataUrl: string) => {
      if (!service || !signatureType) return;
      setIsSigning(true);
      
      const fieldToUpdate = signatureType === 'reception' ? 'customerSignatureReception' : 'customerSignatureDelivery';
      const toastTitle = signatureType === 'reception' ? 'Firma de Recepción Guardada' : 'Firma de Conformidad Guardada';

      const dataToSave = {
        publicId: service.publicId || service.id,
        [fieldToUpdate]: signatureDataUrl,
      };

      const result = await savePublicDocument('service', dataToSave);

      if (result.success) {
          toast({ title: toastTitle });
      } else {
          console.error("Error saving signature:", result.error);
          toast({ title: 'Error al Guardar Firma', description: result.error, variant: 'destructive' });
      }

      setIsSigning(false);
      setSignatureType(null);
  };
  
  const handleScheduleAppointment = async (selectedDateTime: Date) => {
    if (!service) return;
    try {
        const result = await scheduleAppointmentAction(publicId, selectedDateTime.toISOString());
        if (result.success) {
            toast({
                title: "Cita Agendada",
                description: "Tu cita ha sido registrada. Nuestro equipo la confirmará a la brevedad.",
            });
            setIsScheduling(false);
        } else {
            throw new Error(result.error);
        }
    } catch (e: any) {
        toast({
            title: "Error al Agendar",
            description: e.message || "No se pudo agendar la cita. Por favor, inténtelo más tarde.",
            variant: "destructive",
        });
    }
  };
  
  const handleConfirmAppointment = async () => {
    if (!service) return;
    setIsConfirming(true);
    try {
      const response = await fetch(`/api/services/${publicId}/confirm`, { method: 'POST' });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error del servidor');
      }

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

  const handleSignClick = () => {
      if(service.status === 'En Taller' && !service.customerSignatureReception) {
          setSignatureType('reception');
      } else if (service.status === 'Entregado' && !service.customerSignatureDelivery) {
          setSignatureType('delivery');
      }
  }
  
  return (
     <>
        <div className="container mx-auto py-4 sm:py-8">
            <QuoteSheetContent
              quote={service as any}
              onScheduleClick={() => setIsScheduling(true)}
              onConfirmClick={handleConfirmAppointment}
              isConfirming={isConfirming}
            />
        </div>
        
        <SignatureDialog 
            open={!!signatureType} 
            onOpenChange={(isOpen) => !isOpen && setSignatureType(null)} 
            onSave={handleSaveSignature}
        />
        
        <AppointmentScheduler
            open={isScheduling}
            onOpenChange={setIsScheduling}
            onConfirm={handleScheduleAppointment}
        />
     </>
  );
}
