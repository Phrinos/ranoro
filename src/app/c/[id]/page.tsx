
"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { QuoteContent } from '@/components/quote-content';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { QuoteRecord, Vehicle, WorkshopInfo } from '@/types';
import { ShieldAlert, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebasePublic.js';


export default function PublicQuoteViewPage() {
  const params = useParams();
  const quoteId = params.id as string;
  const { toast } = useToast();
  const quoteContentRef = useRef<HTMLDivElement>(null);

  const [quote, setQuote] = useState<QuoteRecord | null | undefined>(undefined);
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quoteId) {
      setError("No se proporcionó un ID de cotización en el enlace.");
      setQuote(null);
      return;
    }

    if (!db) {
        console.error("Firebase (db) no está configurado. No se puede cargar la cotización pública.");
        setError("La conexión con la base de datos no está configurada. Este enlace no funcionará.");
        setQuote(null);
        return;
    }

    const fetchPublicQuote = async () => {
      try {
        const quoteRef = doc(db, 'publicQuotes', quoteId);
        const docSnap = await getDoc(quoteRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          const quoteData = data as QuoteRecord & { vehicle?: Vehicle };
          setQuote(quoteData);
          setVehicle(quoteData.vehicle || null);
          setWorkshopInfo(quoteData.workshopInfo || null);
        } else {
          console.log("No such public quote document!");
          setError(`La cotización con ID "${quoteId}" no se encontró. Pudo haber sido eliminada o el enlace es incorrecto.`);
          setQuote(null);
        }
      } catch (err) {
        console.error("Error fetching public quote:", err);
        setError("Ocurrió un error al intentar cargar la cotización desde la base de datos. Por favor, intente más tarde.");
        setQuote(null);
      }
    };

    fetchPublicQuote();
  }, [quoteId]);

  const handleDownloadPDF = async () => {
    if (!quoteContentRef.current || !quote) return;
    const html2pdf = (await import('html2pdf.js')).default;
    const element = quoteContentRef.current;
    const pdfFileName = `Cotizacion-${quote.id}.pdf`;
    const opt = {
      margin: 7.5,
      filename: pdfFileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
    toast({ title: "Generando PDF...", description: `Se está preparando ${pdfFileName}.` });
    html2pdf().from(element).set(opt).save().then(() => {
        toast({
          title: "PDF Descargado",
          description: "El archivo se ha guardado exitosamente.",
          duration: 2000,
        });
      }).catch((err: any) => {
        toast({
          title: "Error al generar PDF",
          description: "Ocurrió un problema al crear el archivo.",
          variant: "destructive",
        });
        console.error("PDF generation error:", err);
      });
  };
  

  if (quote === undefined) {
    return (
      <div className="container mx-auto py-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando cotización...</p>
      </div>
    );
  }
  
  if (error || !quote) {
     return (
      <div className="container mx-auto py-8">
        <Card className="max-w-4xl mx-auto text-center">
          <CardHeader>
            <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
            <CardTitle className="text-2xl font-bold">Error al Cargar la Cotización</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-left">
            <div>
              <p className="font-semibold text-foreground">Motivo del Error:</p>
              <p className="text-muted-foreground bg-muted p-3 rounded-md mt-1 text-sm">{error}</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">¿Qué puede hacer?</p>
              <ul className="list-disc pl-5 text-muted-foreground text-sm space-y-1 mt-1">
                <li>Verifique que el enlace (URL) sea correcto y no le falten caracteres.</li>
                <li>Si el problema persiste, es posible que el documento haya sido eliminado o el enlace haya expirado.</li>
                <li>Por favor, contacte al taller para solicitar una nueva cotización.</li>
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

  return (
    <div className="container mx-auto">
        <Card className="max-w-4xl mx-auto mb-6 print:hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>Vista Pública de Cotización: {quote.id}</CardTitle>
                    <CardDescription>Esta es una vista previa de la cotización. Puede descargarla.</CardDescription>
                </div>
                 <div className="flex gap-2">
                    <Button onClick={handleDownloadPDF}><Download className="mr-2 h-4 w-4"/> Descargar PDF</Button>
                 </div>
            </CardHeader>
        </Card>
      <div className="bg-white mx-auto shadow-2xl printable-content">
         <QuoteContent 
            ref={quoteContentRef} 
            quote={quote} 
            vehicle={vehicle || undefined} 
            workshopInfo={workshopInfo || undefined} 
        />
      </div>
    </div>
  );
}
