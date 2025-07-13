

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ServiceSheetContent } from '@/components/service-sheet-content';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ServiceRecord, Vehicle, QuoteRecord, WorkshopInfo } from '@/types';
import { ShieldAlert, Printer, Loader2, Signature, Eye, Download, MessageSquare, Check, Wrench, ShieldCheck, Camera } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { SignatureDialog } from '@/app/(app)/servicios/components/signature-dialog';
import { doc, setDoc, onSnapshot, getDoc, updateDoc } from 'firebase/firestore'; 
import { db } from '@/lib/firebasePublic.js';
import Image from "next/image";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QuoteContent } from '@/components/quote-content';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';


export default function PublicServiceSheetPage() {
  const params = useParams();
  const publicId = params.id as string;
  const { toast } = useToast();
  const serviceSheetRef = useRef<HTMLDivElement>(null);

  const [service, setService] = useState<ServiceRecord | null | undefined>(undefined);
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const [isSigning, setIsSigning] = useState(false);
  const [signatureType, setSignatureType] = useState<'reception' | 'delivery' | null>(null);

  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  
  const showOrder = service?.status !== 'Cotizacion' && service?.status !== 'Agendado';
  const showQuote = !!(service?.status === 'Cotizacion' || service?.status === 'Agendado');
  const showChecklist = !!service?.safetyInspection && Object.keys(service.safetyInspection).some(k => k !== 'inspectionNotes' && k !== 'technicianSignature' && (service?.safetyInspection as any)[k]?.status !== 'na' && (service?.safetyInspection as any)[k]?.status !== undefined);
  const showPhotoReport = !!service?.photoReports && service.photoReports.length > 0 && service.photoReports.some(r => r.photos.length > 0);
  
  const tabs = [];
  if (showQuote) tabs.push({ value: 'quote', label: 'Cotización', icon: Eye });
  if (showOrder) tabs.push({ value: 'order', label: 'Orden', icon: Wrench });
  if (showChecklist) tabs.push({ value: 'checklist', label: 'Revisión', icon: ShieldCheck });
  if (showPhotoReport) tabs.push({ value: 'photoreport', label: 'Fotos', icon: Camera });
    
  const defaultTabValue = service?.status === 'Cotizacion' || service?.status === 'Agendado' ? 'quote' : 'order';
  const [activeTab, setActiveTab] = useState(defaultTabValue);

  const gridColsClass = 
    tabs.length === 4 ? 'grid-cols-4' :
    tabs.length === 3 ? 'grid-cols-3' :
    tabs.length === 2 ? 'grid-cols-2' :
    'grid-cols-1';

  useEffect(() => {
    if (!publicId || !db) {
      setError("Enlace inválido o base de datos no configurada.");
      setService(null);
      return;
    }
    
    const serviceRef = doc(db, 'publicServices', publicId);
    
    const unsubscribe = onSnapshot(serviceRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const serviceData = data as ServiceRecord;
        setService(serviceData);
        setVehicle(serviceData.vehicle || null);
        setWorkshopInfo(serviceData.workshopInfo || null);
        setError(null);
        setActiveTab(serviceData.status === 'Cotizacion' || serviceData.status === 'Agendado' ? 'quote' : 'order');
      } else {
        setError(`El documento con ID "${publicId}" no se encontró. Pudo haber sido eliminado o el enlace es incorrecto.`);
        setService(null);
      }
    }, (err) => {
      console.error("Error with real-time listener:", err);
      setError("Ocurrió un error al intentar cargar el documento desde la base de datos. Por favor, intente más tarde.");
      setService(null);
    });

    return () => unsubscribe();
  }, [publicId]);

  const handleOpenSignatureDialog = (type: 'reception' | 'delivery') => {
    setSignatureType(type);
  };
  
  const handleDownloadImage = useCallback(() => {
    if (!viewingImageUrl) return;
    try {
      window.open(viewingImageUrl, '_blank')?.focus();
    } catch (err) {
      console.error("Error opening image:", err);
      toast({ title: "Error al Abrir", variant: "destructive" });
    }
  }, [viewingImageUrl, toast]);

  const handleSaveSignature = async (signatureDataUrl: string) => {
    if (!signatureType || !publicId || !db) return;
    setIsSigning(true);
    try {
      const fieldToUpdate = signatureType === 'reception' ? 'customerSignatureReception' : 'customerSignatureDelivery';
      const serviceRef = doc(db, 'publicServices', publicId);
      await updateDoc(serviceRef, { [fieldToUpdate]: signatureDataUrl });
      setSignatureType(null); // Close dialog
      toast({ title: "Firma Guardada", description: "Su firma ha sido guardada exitosamente." });
    } catch (error) {
      toast({ title: "Error al Guardar", variant: "destructive" });
    } finally {
      setIsSigning(false);
    }
  };

  const handleViewImage = useCallback((url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  }, []);

  if (service === undefined) {
    return (
      <div className="container mx-auto py-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando documento...</p>
      </div>
    );
  }
  
  if (error || !service || !vehicle) {
     return (
      <div className="container mx-auto py-8">
        <Card className="max-w-4xl mx-auto text-center"><CardHeader><ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" /><CardTitle className="text-2xl font-bold">Error al Cargar el Documento</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-left">
            <div>
              <p className="font-semibold text-foreground">Motivo del Error:</p>
              <p className="text-muted-foreground bg-muted p-3 rounded-md mt-1 text-sm">{error || "Datos del vehículo no encontrados."}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">¿Qué puede hacer?</p>
              <ul className="list-disc pl-5 text-muted-foreground text-sm space-y-1 mt-1">
                <li>Verifique que el enlace (URL) sea correcto.</li>
                <li>Contacte al taller para solicitar un nuevo enlace.</li>
              </ul>
            </div>
            <div className="text-center">
              <Button asChild className="mt-6"><Link href="/login">Volver al Inicio</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showSignReception = service.status !== 'Cotizacion' && !service.customerSignatureReception;
  const showSignDelivery = service.status === 'Entregado' && !!service.customerSignatureReception && !service.customerSignatureDelivery;

  return (
    <div className="container mx-auto">
      <Card className="max-w-4xl mx-auto mb-6 print:hidden">
        <CardHeader>
          <CardTitle>Vista Pública: {service.status === 'Cotizacion' ? 'Cotización' : 'Orden de Servicio'} #{service.id}</CardTitle>
          <CardDescription>Revise los detalles y firme digitalmente si es necesario.</CardDescription>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full pt-2">
                <TabsList className={`grid w-full ${gridColsClass}`}>
                    {tabs.map(tab => <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{tab.label}</TabsTrigger>)}
                </TabsList>
            </Tabs>
        </CardHeader>
        <CardContent className="flex justify-end">
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4"/> Imprimir</Button>
        </CardContent>
      </Card>
      <div id="printable-area-preview" className="bg-white mx-auto shadow-2xl printable-content max-w-4xl">
        <ServiceSheetContent
          ref={serviceSheetRef}
          service={service}
          vehicle={vehicle}
          workshopInfo={workshopInfo || undefined}
          onViewImage={handleViewImage}
          isPublicView={true}
          showSignReception={showSignReception}
          showSignDelivery={showSignDelivery}
          onSignClick={handleOpenSignatureDialog}
          isSigning={isSigning}
          activeTab={activeTab}
        />
      </div>
      <SignatureDialog
        open={!!signatureType}
        onOpenChange={(isOpen) => !isOpen && setSignatureType(null)}
        onSave={handleSaveSignature}
      />
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader className="print:hidden"><DialogTitle>Vista Previa de Imagen</DialogTitle></DialogHeader>
          <div className="relative aspect-video w-full">
            {viewingImageUrl && (<Image src={viewingImageUrl} alt="Vista ampliada de evidencia" fill className="object-contain" crossOrigin="anonymous" />)}
          </div>
          <DialogFooter className="mt-2 print:hidden"><Button onClick={handleDownloadImage}><Download className="mr-2 h-4 w-4"/>Descargar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
