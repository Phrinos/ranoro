
// src/app/(public)/vistaprevia/[id]/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebasePublic.js';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ServiceRecord, Vehicle, WorkshopInfo } from '@/types';
import { ServiceSheetContent } from '@/components/ServiceSheetContent';
import { SignatureDialog } from '@/app/(app)/servicios/components/signature-dialog';
import { saveSignatureAction } from '@/app/(public)/s/actions';


export default function PublicServicePage() {
  const params = useParams();
  const publicId = params.id as string;
  const { toast } = useToast();

  const [service, setService] = useState<ServiceRecord | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  
  const [isSigning, setIsSigning] = useState(false);
  const [signatureType, setSignatureType] = useState<'reception' | 'delivery' | null>(null);

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
      
      const toastTitle = signatureType === 'reception' ? 'Firma de Recepción Guardada' : 'Firma de Conformidad Guardada';

      const result = await saveSignatureAction(publicId, signatureDataUrl, signatureType);

      if (result.success) {
          toast({ title: toastTitle });
      } else {
          console.error("Error saving signature:", result.error);
          toast({ title: 'Error al Guardar Firma', description: result.error, variant: 'destructive' });
      }

      setIsSigning(false);
      setSignatureType(null);
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
              onSignClick={handleSignClick}
              isSigning={isSigning}
              activeTab="order"
            />
        </div>
        
        <SignatureDialog 
            open={isSigning} 
            onOpenChange={(isOpen) => !isOpen && setIsSigning(false)} 
            onSave={handleSaveSignature}
        />
     </>
  );
}
