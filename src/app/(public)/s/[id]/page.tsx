

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebasePublic.js';
import { Loader2, ShieldAlert, Eye, Wrench, ShieldCheck, Camera } from 'lucide-react';
import { SignatureDialog } from '@/app/(app)/servicios/components/signature-dialog';
import { useToast } from '@/hooks/use-toast';
import { ServiceSheetContent } from '@/components/service-sheet-content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ServiceRecord, Vehicle, WorkshopInfo } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Image from 'next/image';
import { Download } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { savePublicDocument } from '@/lib/public-document';

export default function PublicServicePage() {
  const params = useParams();
  const publicId = params.id as string;
  const { toast } = useToast();

  const [service, setService] = useState<ServiceRecord | null | undefined>(undefined);
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [isSigning, setIsSigning] = useState(false);
  const [signatureType, setSignatureType] = useState<'reception' | 'delivery' | null>(null);
  
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (!publicId || !db) {
      setError("Enlace inválido o la base de datos no está disponible.");
      setService(null);
      return;
    }
    const docRef = doc(db, 'publicServices', publicId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setService(data as ServiceRecord);
            setVehicle(data.vehicle as Vehicle); // Vehicle data is embedded
            setWorkshopInfo(data.workshopInfo as WorkshopInfo);
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

      // Use the new centralized function to save the signature to the public collection
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


  const showOrder = service && service.status !== 'Cotizacion' && service.status !== 'Agendado';
  const showQuote = service && (service.status === 'Cotizacion' || service.status === 'Agendado');
  const showChecklist = service && !!service.safetyInspection && Object.keys(service.safetyInspection).some(k => k !== 'inspectionNotes' && k !== 'technicianSignature' && (service.safetyInspection as any)[k]?.status !== 'na' && (service.safetyInspection as any)[k]?.status !== undefined);
  const showPhotoReport = service && !!service.photoReports && service.photoReports.length > 0 && service.photoReports.some(r => r.photos.length > 0);

  const tabs = [];
  if (showQuote) tabs.push({ value: 'quote', label: 'Cotización', icon: Eye });
  if (showOrder) tabs.push({ value: 'order', label: 'Orden', icon: Wrench });
  if (showChecklist) tabs.push({ value: 'checklist', label: 'Revisión', icon: ShieldCheck });
  if (showPhotoReport) tabs.push({ value: 'photoreport', label: 'Fotos', icon: Camera });

  const defaultTabValue = service && (service.status === 'Cotizacion' || service.status === 'Agendado') ? 'quote' : 'order';
  const [activeTab, setActiveTab] = useState(defaultTabValue);
  
  useEffect(() => {
    setActiveTab(defaultTabValue);
  }, [defaultTabValue]);


  const gridColsClass = 
    tabs.length === 4 ? 'grid-cols-4' :
    tabs.length === 3 ? 'grid-cols-3' :
    tabs.length === 2 ? 'grid-cols-2' :
    'grid-cols-1';

  if (service === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!service || error) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-xl mx-auto text-center">
          <CardHeader>
            <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
            <CardTitle className="text-2xl font-bold">Error al Cargar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || "No se pudo cargar el documento del servicio."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
     <>
        <div className="container mx-auto px-2 sm:px-4">
            <div className="bg-white mx-auto my-4 shadow-lg printable-content print-format-letter">
              <div className="p-4 print:hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div>
                          <CardTitle>Documento de Servicio</CardTitle>
                          <CardDescription>Folio: {service.id}</CardDescription>
                      </div>
                       {tabs.length > 1 && (
                           <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                              <TabsList className={cn('grid w-full', gridColsClass)}>
                                  {tabs.map(tab => (
                                      <TabsTrigger key={tab.value} value={tab.value}>
                                          <tab.icon className="h-4 w-4 mr-2"/>
                                          {tab.label}
                                      </TabsTrigger>
                                  ))}
                              </TabsList>
                          </Tabs>
                      )}
                  </div>
              </div>
              <div id="printable-area-public" className="bg-white p-8">
                  <ServiceSheetContent
                      service={service}
                      vehicle={vehicle || undefined}
                      workshopInfo={workshopInfo || undefined}
                      onViewImage={(url) => { setViewingImageUrl(url); setIsImageViewerOpen(true); }}
                      isPublicView={true}
                      showSignReception={!service.customerSignatureReception}
                      showSignDelivery={!!service.customerSignatureReception && !service.customerSignatureDelivery}
                      onSignClick={(type) => setSignatureType(type)}
                      isSigning={isSigning}
                      activeTab={activeTab}
                  />
              </div>
            </div>
        </div>
        
        <SignatureDialog 
            open={!!signatureType} 
            onOpenChange={(isOpen) => !isOpen && setSignatureType(null)} 
            onSave={handleSaveSignature}
        />
        
        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
            <DialogContent className="max-w-4xl p-2">
                <DialogHeader><DialogTitle>Vista Previa de Imagen</DialogTitle></DialogHeader>
                <div className="relative aspect-video w-full">
                    {viewingImageUrl && (<Image src={viewingImageUrl} alt="Vista ampliada" fill style={{objectFit:"contain"}} sizes="(max-width: 768px) 100vw, 1024px" crossOrigin="anonymous" />)}
                </div>
                <DialogFooter>
                    <Button onClick={() => window.open(viewingImageUrl || '', '_blank')?.focus()}><Download className="mr-2 h-4 w-4"/>Descargar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
     </>
  );
}
