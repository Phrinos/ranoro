
"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { PublicOwnerReport } from '@/types';
import { ShieldAlert, Download, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebasePublic.js';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

// Component to render the report content
const ReportContent = React.forwardRef<HTMLDivElement, { report: PublicOwnerReport }>(({ report }, ref) => {
  const workshopInfo = report.workshopInfo || { name: 'Taller', logoUrl: '/ranoro-logo.png' };

  return (
    <div ref={ref} className="p-8 font-sans bg-white text-black" data-format="letter">
      <header className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
        <img src={workshopInfo.logoUrl} alt={`${workshopInfo.name} Logo`} className="h-16" data-ai-hint="workshop logo" />
        <div className="text-right">
          <h1 className="text-2xl font-bold">Reporte de Ingresos de Flotilla</h1>
          <p className="text-sm">Propietario: <span className="font-semibold">{report.ownerName}</span></p>
          <p className="text-sm">Mes del Reporte: <span className="font-semibold">{report.reportMonth}</span></p>
        </div>
      </header>

      <main>
        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
          <Card><CardHeader><CardTitle className="text-sm font-medium">Ingreso por Renta</CardTitle><CardDescription className="text-2xl font-bold">{formatCurrency(report.totalRentalIncome)}</CardDescription></CardHeader></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium">Costos de Mantenimiento</CardTitle><CardDescription className="text-2xl font-bold text-destructive">{formatCurrency(report.totalMaintenanceCosts)}</CardDescription></CardHeader></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium">Balance Neto</CardTitle><CardDescription className={`text-2xl font-bold ${report.totalNetBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(report.totalNetBalance)}</CardDescription></CardHeader></Card>
        </div>

        <h2 className="text-xl font-semibold mb-4">Desglose por Vehículo</h2>
        <Table>
          <TableHeader><TableRow><TableHead>Vehículo</TableHead><TableHead className="text-center">Días Rentados</TableHead><TableHead className="text-right">Ingresos</TableHead><TableHead className="text-right">Mantenimiento</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
          <TableBody>
            {report.detailedReport.map(item => {
              const balance = item.rentalIncome - item.maintenanceCosts;
              return (
                <TableRow key={item.vehicleId}>
                  <TableCell className="font-medium">{item.vehicleInfo}</TableCell>
                  <TableCell className="text-center">{item.daysRented}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.rentalIncome)}</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(item.maintenanceCosts)}</TableCell>
                  <TableCell className={`text-right font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(balance)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </main>
      <footer className="text-xs text-center text-gray-500 mt-8 pt-4 border-t">
        Reporte generado por Ranoro - {format(parseISO(report.generatedDate), "dd/MM/yyyy HH:mm", { locale: es })}
      </footer>
    </div>
  );
});
ReportContent.displayName = "ReportContent";


export default function PublicOwnerReportPage() {
  const params = useParams();
  const publicId = params.id as string;
  const { toast } = useToast();
  const reportContentRef = useRef<HTMLDivElement>(null);

  const [report, setReport] = useState<PublicOwnerReport | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicId || !db) {
      setError("Enlace inválido o base de datos no configurada.");
      setReport(null);
      return;
    }

    const fetchReport = async () => {
      try {
        const reportRef = doc(db, 'publicOwnerReports', publicId);
        const docSnap = await getDoc(reportRef);

        if (docSnap.exists()) {
          setReport(docSnap.data() as PublicOwnerReport);
        } else {
          setError(`El reporte con ID "${publicId}" no fue encontrado.`);
          setReport(null);
        }
      } catch (err) {
        console.error("Error fetching public report:", err);
        setError("Ocurrió un error al cargar el reporte.");
        setReport(null);
      }
    };

    fetchReport();
  }, [publicId]);

  const handleDownloadPDF = async () => {
    if (!reportContentRef.current || !report) return;
    const html2pdf = (await import('html2pdf.js')).default;
    const element = reportContentRef.current;
    const pdfFileName = `Reporte_Flotilla_${report.ownerName}_${report.reportMonth}.pdf`.replace(/ /g, '_');
    const opt = {
      margin: 10,
      filename: pdfFileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };
    toast({ title: "Generando PDF...", description: `Se está preparando ${pdfFileName}.` });
    html2pdf().from(element).set(opt).save();
  };

  if (report === undefined) {
    return (
      <div className="container mx-auto py-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando reporte...</p>
      </div>
    );
  }
  
  if (error || !report) {
     return (
      <div className="container mx-auto py-8">
        <Card className="max-w-4xl mx-auto text-center"><CardHeader><ShieldAlert className="mx-auto h-16 w-16 text-destructive mb-4" /><CardTitle className="text-2xl font-bold">Error al Cargar el Reporte</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button asChild className="mt-6"><Link href="/login">Volver al Inicio</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <Card className="max-w-4xl mx-auto mb-6 print:hidden">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div><CardTitle>Reporte de Flotilla para {report.ownerName}</CardTitle><CardDescription>Reporte de {report.reportMonth}.</CardDescription></div>
          <Button onClick={handleDownloadPDF}><Download className="mr-2 h-4 w-4"/> Descargar PDF</Button>
        </CardHeader>
      </Card>
      <div className="bg-white mx-auto shadow-2xl printable-content max-w-4xl">
         <ReportContent report={report} ref={reportContentRef} />
      </div>
    </div>
  );
}
