
"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ServiceSheetContent } from '@/components/service-sheet-content';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ServiceRecord, Vehicle, WorkshopInfo } from '@/types';
import { ShieldAlert, Download, Loader2, Signature, Eye } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { SignatureDialog } from '@/app/(app)/servicios/components/signature-dialog';
import { getDoc, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebasePublic.js';
import Image from "next/legacy/image";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";


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

  // State for image viewer
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!publicId) {
      setError("No se proporcionó un ID de servicio en el enlace.");
      setService(null);
      return;
    }

    if (!db) {
        console.error("Firebase (db) no está configurado. No se puede cargar la hoja de servicio pública.");
        setError("La conexión con la base de datos no está configurada. Este enlace no funcionará.");
        setService(null);
        return;
    }

    const fetchPublicService = async () => {
      try {
        const serviceRef = doc(db, 'publicServices', publicId);
        const docSnap = await getDoc(serviceRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const processDates = (obj: any) => {
            for (const key in obj) {
              if (obj[key] && typeof obj[key].toDate === 'function') {
                obj[key] = obj[key].toDate().toISOString();
              } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                processDates(obj[key]);
              }
            }
          };
          processDates(data);

          const serviceData = data as ServiceRecord & { vehicle?: Vehicle };
          setService(serviceData);
          setVehicle(serviceData.vehicle || null);
          setWorkshopInfo(serviceData.workshopInfo || null);
        } else {
          setError(`La hoja de servicio con ID "${publicId}" no se encontró. Pudo haber sido eliminada o el enlace es incorrecto.`);
          setService(null);
        }
      } catch (err) {
        console.error("Error fetching public service sheet:", err);
        setError("Ocurrió un error al intentar cargar la hoja de servicio desde la base de datos. Por favor, intente más tarde.");
        setService(null);
      }
    };

    fetchPublicService();
  }, [publicId]);

  const handleDownloadPDF = async () => {
    if (!serviceSheetRef.current || !service) return;
    const html2pdf = (await import('html2pdf.js')).default;
    const element = serviceSheetRef.current;
    const pdfFileName = `HojaDeServicio-${service.id}.pdf`;
    const opt = {
      margin: 5,
      filename: pdfFileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
    toast({ title: "Generando PDF...", description: `Se está preparando ${pdfFileName}.` });
    html2pdf().from(element).set(opt).save();
  };

  const handleOpenSignatureDialog = (type: 'reception' | 'delivery') => {
    setSignatureType(type);
  };
  
  const handleDownloadImage = () => {
    if (!viewingImageUrl) return;
    try {
      window.open(viewingImageUrl, '_blank')?.focus();
      toast({
        title: "Abriendo Imagen",
        description: "La imagen se abrió en una nueva pestaña. Puedes guardarla desde ahí.",
      });
    } catch (err) {
      console.error("Error opening image:", err);
      toast({
        title: "Error al Abrir",
        description: "No se pudo abrir la imagen en una nueva pestaña.",
        variant: "destructive"
      });
    }
  };

  const handleSaveSignature = async (signatureDataUrl: string) => {
    if (!signatureType || !publicId) return;
    setIsSigning(true);
    try {
      if (!db) {
        throw new Error("La base de datos no está inicializada.");
      }
      const serviceRef = doc(db, 'publicServices', publicId);
      const fieldToUpdate = signatureType === 'reception' ? 'customerSignatureReception' : 'customerSignatureDelivery';
      
      await setDoc(serviceRef, { [fieldToUpdate]: signatureDataUrl }, { merge: true });

      toast({ title: "Firma Guardada", description: "Su firma ha sido guardada exitosamente." });
      setSignatureType(null);
      window.location.reload(); 
      
    } catch (error) {
      toast({ title: "Error al Guardar", description: `No se pudo guardar la firma. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
    } finally {
      setIsSigning(false);
    }
  };

  const handleViewImage = (url: string) => {
    setViewingImageUrl(url);
    setIsImageViewerOpen(true);
  };

  if (service === undefined) {
    return (
      <div className="container mx-auto py-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando hoja de servicio...</p>
      </div>
    );
  }

  if (error || !service || !vehicle) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-4xl mx-auto text-center">
          <CardHeader>
            <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
            <CardTitle className="text-2xl font-bold">Error al Cargar la Hoja de Servicio</CardTitle>
          </CardHeader>
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
              <Button asChild className="mt-6">
                <Link href="/login">Volver al Inicio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showSignReception = !service.customerSignatureReception;
  const showSignDelivery = service.status === 'Completado' && !!service.customerSignatureReception && !service.customerSignatureDelivery;

  return (
    <div className="container mx-auto">
      <Card className="max-w-4xl mx-auto mb-6 print:hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Hoja de Servicio: {service.id}</CardTitle>
            <CardDescription>Revise los detalles y firme digitalmente si es necesario.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {showSignReception && (
              <Button onClick={() => handleOpenSignatureDialog('reception')} disabled={isSigning}>
                {isSigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Signature className="mr-2 h-4 w-4"/>}
                 Firmar Recepción
              </Button>
            )}
            {showSignDelivery && (
              <Button onClick={() => handleOpenSignatureDialog('delivery')} className="bg-green-600 hover:bg-green-700" disabled={isSigning}>
                {isSigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Signature className="mr-2 h-4 w-4"/>}
                 Firmar Entrega
              </Button>
            )}
            <Button variant="outline" onClick={handleDownloadPDF}><Download className="mr-2 h-4 w-4"/> Descargar PDF</Button>
          </div>
        </CardHeader>
      </Card>
      <div className="bg-white mx-auto shadow-2xl printable-content">
        <ServiceSheetContent 
          ref={serviceSheetRef} 
          service={service} 
          vehicle={vehicle} 
          workshopInfo={workshopInfo || undefined} 
          onViewImage={handleViewImage}
        />
      </div>
      <SignatureDialog
        open={!!signatureType}
        onOpenChange={(isOpen) => !isOpen && setSignatureType(null)}
        onSave={handleSaveSignature}
      />
      <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
        <DialogContent className="max-w-4xl p-2">
            <DialogHeader className="print:hidden">
              <DialogTitle>Vista Previa de Imagen</DialogTitle>
              <CardDescription>
                Visualizando imagen de evidencia. Puede descargar una copia.
              </CardDescription>
            </DialogHeader>
            <div className="relative aspect-video w-full">
                {viewingImageUrl && (
                    <Image src={viewingImageUrl} alt="Vista ampliada de evidencia" layout="fill" objectFit="contain" />
                )}
            </div>
            <DialogFooter className="mt-2 print:hidden">
                <Button onClick={handleDownloadImage}>
                    <Download className="mr-2 h-4 w-4"/>Descargar Imagen
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
