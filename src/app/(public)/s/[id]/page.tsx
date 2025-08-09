// src/app/(public)/s/[id]/page.tsx

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebasePublic.js';
import { Loader2, ShieldAlert, Eye, Wrench, ShieldCheck, Camera, Download, Signature, User, Phone, Mail, Link as LinkIcon, Printer, Car, Fingerprint, CalendarCheck } from 'lucide-react';
import { SignatureDialog } from '@/app/(app)/servicios/components/signature-dialog';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ServiceRecord, Vehicle, WorkshopInfo, SafetyInspection, SafetyCheckStatus, QuoteRecord, Payment, ServiceItem } from '@/types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, normalizeDataUrl, calculateDriverDebt, formatCurrency, capitalizeWords } from "@/lib/utils";
import { savePublicDocument } from '@/lib/public-document';
import Link from 'next/link';
import { format, isValid, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { QuoteContent } from '@/components/quote-content';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GARANTIA_CONDICIONES_TEXT } from '@/lib/constants/legal-text';


// Component to render the page header
const PageHeader = ({ workshopInfo, serviceId }: { workshopInfo: Partial<WorkshopInfo>, serviceId: string }) => (
    <header className="mb-8 print:mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
            <div className="relative w-[180px] h-[60px]">
                 <Image
                    src={workshopInfo.logoUrl || '/ranoro-logo.png'}
                    alt={`${workshopInfo.name || 'Ranoro'} Logo`}
                    fill
                    style={{ objectFit: 'contain' }}
                    data-ai-hint="workshop logo"
                    priority
                />
            </div>
            <div className="text-left sm:text-right">
                <h1 className="text-2xl font-bold">Documento de Servicio</h1>
                <p className="font-mono text-muted-foreground">Folio: {serviceId}</p>
            </div>
        </div>
    </header>
);

// Component for Client and Vehicle info cards
const InfoCards = ({ vehicle }: { vehicle?: Vehicle | null }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:mb-4">
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2"><User className="h-5 w-5 text-primary"/>Datos del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
                <p className="font-semibold">{vehicle?.ownerName || 'N/A'}</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4"/><span>{vehicle?.ownerPhone || 'N/A'}</span>
                </div>
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4"/><span>{vehicle?.ownerEmail || 'N/A'}</span>
                </div>
            </CardContent>
        </Card>
         <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2"><Car className="h-5 w-5 text-primary"/>Datos del Vehículo</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
                <p className="font-semibold">{vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : 'N/A'}</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Fingerprint className="h-4 w-4"/><span>{vehicle?.licensePlate || 'N/A'}</span>
                </div>
                 <div className="flex items-center gap-2 text-muted-foreground">
                    <span>VIN: {vehicle?.vin || 'N/A'}</span>
                </div>
            </CardContent>
        </Card>
    </div>
);

// --- Sub-components for Tab Content ---

const ServiceDetailsContent = ({ service }: { service: ServiceRecord }) => (
  <div className="space-y-4">
    <Card>
      <CardHeader><CardTitle>Trabajos a Realizar</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {service.serviceItems?.map((item, index) => (
          <div key={index} className="flex justify-between items-start border-b pb-3 last:border-b-0">
            <div>
              <p className="font-semibold">{item.name}</p>
              {item.suppliesUsed && item.suppliesUsed.length > 0 && (
                <p className="text-xs text-muted-foreground">Insumos: {item.suppliesUsed.map(s => `${s.quantity}x ${s.supplyName}`).join(', ')}</p>
              )}
            </div>
            <p className="font-semibold">{formatCurrency(item.price)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
    
    <Card>
      <CardHeader><CardTitle>Resumen de Costos</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(service.subTotal)}</span></div>
        <div className="flex justify-between"><span>IVA (16%):</span><span>{formatCurrency(service.taxAmount)}</span></div>
        <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total:</span><span className="text-primary">{formatCurrency(service.totalCost)}</span></div>
      </CardContent>
    </Card>
  </div>
);

const ReceptionContent = ({ service, onSignClick, isSigning, showSignReception }: {
    service: ServiceRecord;
    onSignClick?: (type: 'reception' | 'delivery') => void;
    isSigning?: boolean;
    showSignReception?: boolean;
}) => (
  <div className="space-y-4">
     <Card>
        <CardHeader><CardTitle>Condiciones del Vehículo</CardTitle></CardHeader>
        <CardContent>
            <p className="whitespace-pre-wrap">{service.vehicleConditions || 'No se especificaron condiciones.'}</p>
        </CardContent>
     </Card>
     <Card>
        <CardHeader><CardTitle>Pertenencias del Cliente</CardTitle></CardHeader>
        <CardContent>
            <p className="whitespace-pre-wrap">{service.customerItems || 'No se registraron pertenencias.'}</p>
        </CardContent>
     </Card>
     <Card>
        <CardHeader><CardTitle>Firma de Recepción</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
            {service.customerSignatureReception ? (
                 <Image src={normalizeDataUrl(service.customerSignatureReception)} alt="Firma de recepción" width={300} height={150} style={{ objectFit: 'contain' }} className="border rounded-md" />
            ) : showSignReception && onSignClick ? (
                 <Button onClick={() => onSignClick('reception')} disabled={isSigning} className="w-full sm:w-auto">
                    {isSigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Signature className="mr-2 h-4 w-4"/>}
                    Firmar de Conformidad
                </Button>
            ) : ( <p className="text-muted-foreground">Firma pendiente.</p> )}
            <p className="text-xs text-muted-foreground">{GARANTIA_CONDICIONES_TEXT.split('\n')[1]}</p>
        </CardContent>
     </Card>
  </div>
);


// --- Main Page Component ---

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
            setVehicle(data.vehicle as Vehicle);
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

      const result = await savePublicDocument('service', dataToSave);

      if (result.success) {
          toast({ title: toastTitle });
      } else {
          toast({ title: 'Error al Guardar Firma', description: result.error, variant: 'destructive' });
      }

      setIsSigning(false);
      setSignatureType(null);
  };


  const showQuote = service && (service.status === 'Cotizacion' || service.status === 'Agendado');
  const showServiceDetails = service && service.status !== 'Cotizacion' && service.status !== 'Agendado';
  const showChecklist = service && !!service.safetyInspection && Object.keys(service.safetyInspection).some(k => k !== 'inspectionNotes' && k !== 'technicianSignature' && (service.safetyInspection as any)[k]?.status !== 'na' && (service.safetyInspection as any)[k]?.status !== undefined);
  const showPhotoReport = service && !!service.photoReports && service.photoReports.length > 0 && service.photoReports.some(r => r.photos.length > 0);

  const tabs = [];
  if (showQuote) tabs.push({ value: 'quote', label: 'Cotización', icon: Eye });
  if (showServiceDetails) {
      tabs.push({ value: 'details', label: 'Detalles del Servicio', icon: Wrench });
      tabs.push({ value: 'reception', label: 'Recepción', icon: Wrench });
  }
  if (showChecklist) tabs.push({ value: 'checklist', label: 'Puntos de Seguridad', icon: ShieldCheck });
  if (showPhotoReport) tabs.push({ value: 'photoreport', label: 'Reporte Fotográfico', icon: Camera });

  const defaultTabValue = service && (service.status === 'Cotizacion' || service.status === 'Agendado') ? 'quote' : 'details';
  const [activeTab, setActiveTab] = useState(defaultTabValue);
  
  useEffect(() => {
    setActiveTab(defaultTabValue);
  }, [defaultTabValue]);

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
            <PageHeader workshopInfo={workshopInfo || {}} serviceId={service.id} />
            <InfoCards vehicle={vehicle} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full h-auto p-0 bg-transparent gap-2 print:hidden">
                    {tabs.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value} className="flex-1 min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug flex items-center justify-center data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-card data-[state=inactive]:text-card-foreground hover:data-[state=inactive]:bg-muted/80">
                            <tab.icon className="mr-2 h-4 w-4 shrink-0"/>{tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
                <div className="mt-6">
                    <TabsContent value="quote">
                        {showQuote && <QuoteContent quote={service as QuoteRecord} vehicle={vehicle} workshopInfo={workshopInfo || undefined} />}
                    </TabsContent>
                    <TabsContent value="details">
                        {showServiceDetails && <ServiceDetailsContent service={service} />}
                    </TabsContent>
                     <TabsContent value="reception">
                        {showServiceDetails && <ReceptionContent service={service} onSignClick={(type) => setSignatureType(type)} isSigning={isSigning} showSignReception={!service.customerSignatureReception} />}
                    </TabsContent>
                    {/* Placeholder for other tabs */}
                    <TabsContent value="checklist"><p>Checklist content goes here.</p></TabsContent>
                    <TabsContent value="photoreport"><p>Photo report content goes here.</p></TabsContent>
                </div>
            </Tabs>
        </div>
        
        <SignatureDialog 
            open={!!signatureType} 
            onOpenChange={(isOpen) => !isOpen && setSignatureType(null)} 
            onSave={handleSaveSignature}
        />
        
        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
            <DialogContent className="max-w-4xl p-0 bg-transparent border-none shadow-none">
                {viewingImageUrl && (<div className="relative aspect-video w-full"><Image src={viewingImageUrl} alt="Vista ampliada de evidencia" fill style={{ objectFit: 'contain' }} sizes="(max-width: 768px) 100vw, 1024px" crossOrigin="anonymous"/></div>)}
            </DialogContent>
        </Dialog>
     </>
  );
}
