
"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { QuoteContent } from '@/components/quote-content';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { QuoteRecord, Vehicle } from '@/types';
import { ShieldAlert, Download, Printer } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import html2pdf from 'html2pdf.js';


export default function PublicQuoteViewPage() {
  const params = useParams();
  const quoteId = params.id as string;
  const { toast } = useToast();
  const quoteContentRef = useRef<HTMLDivElement>(null);

  const [quote, setQuote] = useState<QuoteRecord | null | undefined>(undefined);
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== 'undefined' && quoteId) {
      try {
        const storedQuotesString = localStorage.getItem('placeholderQuotes');
        const storedVehiclesString = localStorage.getItem('placeholderVehicles');
        
        const allQuotes: QuoteRecord[] = storedQuotesString ? JSON.parse(storedQuotesString) : [];
        const allVehicles: Vehicle[] = storedVehiclesString ? JSON.parse(storedVehiclesString) : [];

        const foundQuote = allQuotes.find(q => q.id === quoteId);
        setQuote(foundQuote || null);

        if (foundQuote) {
          const foundVehicle = allVehicles.find(v => v.id === foundQuote.vehicleId);
          setVehicle(foundVehicle || null);
        }

      } catch (error) {
        console.error("Error reading data from localStorage:", error);
        setQuote(null);
        setVehicle(null);
      }
    }
  }, [quoteId]);

  const handleDownloadPDF = () => {
    if (!quoteContentRef.current || !quote) return;
    const element = quoteContentRef.current;
    const pdfFileName = `Cotizacion-${quote.id}.pdf`;
    const opt = {
      margin:       0.5,
      filename:     pdfFileName,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    toast({ title: "Generando PDF...", description: `Se está preparando ${pdfFileName}.` });
    html2pdf().from(element).set(opt).save();
  };
  
   const handlePrint = () => {
    if (!quoteContentRef.current || !quote) return;
    const element = quoteContentRef.current;
    const pdfFileName = `Cotizacion-${quote.id}.pdf`;
    const opt = {
      margin:       0.5,
      filename:     pdfFileName,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(element).set(opt).output('bloburl').then((url: string) => {
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
            setTimeout(() => {
                try {
                    printWindow.print();
                } catch(e) {
                     toast({ title: "Error de Impresión", description: "El diálogo de impresión fue bloqueado. Por favor, permita las ventanas emergentes.", variant: "destructive"});
                     console.error("Print failed:", e);
                }
            }, 250); // Small delay to ensure PDF is fully rendered
        };
      } else {
        toast({ title: "Error", description: "No se pudo abrir la ventana de impresión. Verifique si su navegador bloquea las ventanas emergentes.", variant: "destructive"});
      }
    });
  };


  if (quote === undefined) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p>Cargando cotización...</p>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-4xl mx-auto text-center">
          <CardHeader>
            <ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" />
            <CardTitle className="text-2xl font-bold">Cotización no encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">La cotización con ID <span className="font-mono">{quoteId}</span> no se encontró en el almacenamiento de este navegador.</p>
            <p className="text-muted-foreground mt-2">Los enlaces de cotización solo se pueden abrir en el mismo navegador donde se crearon.</p>
            <Button asChild className="mt-6">
              <Link href="/dashboard">Volver al Panel Principal</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
        <Card className="max-w-4xl mx-auto mb-6">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <CardTitle>Vista Pública de Cotización: {quote.id}</CardTitle>
                    <CardDescription>Esta es una vista previa de la cotización. Puede descargarla o imprimirla.</CardDescription>
                </div>
                 <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Imprimir</Button>
                    <Button onClick={handleDownloadPDF}><Download className="mr-2 h-4 w-4"/> Descargar PDF</Button>
                 </div>
            </CardHeader>
        </Card>
      <div className="bg-white mx-auto shadow-2xl">
         <QuoteContent ref={quoteContentRef} quote={quote} vehicle={vehicle || undefined} />
      </div>
    </div>
  );
}
