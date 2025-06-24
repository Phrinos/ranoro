
"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ServiceSheetContent } from '@/app/(app)/servicios/components/service-sheet-content';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ServiceRecord, Vehicle } from '@/types';
import { ShieldAlert, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import html2pdf from 'html2pdf.js';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@root/lib/firebaseClient.js';

export default function PublicServiceSheetPage() {
  const params = useParams();
  const publicId = params.id as string;
  const { toast } = useToast();
  const serviceSheetRef = useRef<HTMLDivElement>(null);

  const [service, setService] = useState<ServiceRecord | null | undefined>(undefined);
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);

  useEffect(() => {
    if (!publicId) {
      setService(null);
      return;
    }

    if (!db) {
        console.error("Firebase (db) no está configurado. No se puede cargar la hoja de servicio pública.");
        setService(null);
        return;
    }

    const fetchPublicService = async () => {
      try {
        const serviceRef = doc(db, 'publicServices', publicId);
        const docSnap = await getDoc(serviceRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const serviceData = data as ServiceRecord & { vehicle?: Vehicle };
          setService(serviceData);
          setVehicle(serviceData.vehicle || null);
        } else {
          console.log("No such public service document!");
          setService(null);
          setVehicle(null);
        }
      } catch (error) {
        console.error("Error fetching public service sheet:", error);
        toast({
          title: "Error de Carga",
          description: "No se pudo cargar la hoja de servicio.",
          variant: "destructive"
        });
        setService(null);
        setVehicle(null);
      }
    };

    fetchPublicService();
  }, [publicId, toast]);

  const handleDownloadPDF = () => {
    if (!serviceSheetRef.current || !service) return;
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

  if (service === undefined) {
    return (
      <div className="container mx-auto py-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando hoja de servicio...</p>
      </div>
    );
  }

  if (!service || !vehicle) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-4xl mx-auto text-center">
          <CardHeader>
            <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
            <CardTitle className="text-2xl font-bold">Hoja de Servicio no encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">La hoja de servicio que busca no se encontró o ha expirado.</p>
            <p className="text-muted-foreground mt-2">Por favor, contacte al taller para un nuevo enlace.</p>
            <Button asChild className="mt-6">
              <Link href="/login">Volver al Inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
        <Card className="max-w-4xl mx-auto mb-6 print:hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>Hoja de Servicio: {service.id}</CardTitle>
                    <CardDescription>Esta es una vista pública de la hoja de servicio. Puede descargarla como PDF.</CardDescription>
                </div>
                 <div className="flex gap-2">
                    <Button onClick={handleDownloadPDF}><Download className="mr-2 h-4 w-4"/> Descargar PDF</Button>
                 </div>
            </CardHeader>
        </Card>
      <div className="bg-white mx-auto shadow-2xl printable-content">
         <ServiceSheetContent ref={serviceSheetRef} service={service} vehicle={vehicle} />
      </div>
    </div>
  );
}
