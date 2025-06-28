
"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  placeholderVehicles,
  placeholderRentalPayments,
  placeholderServiceRecords,
  placeholderVehicleExpenses,
  placeholderPublicOwnerReports,
  persistToFirestore,
  sanitizeObjectForFirestore,
} from '@/lib/placeholder-data';
import type { PublicOwnerReport, Vehicle, RentalPayment, ServiceRecord, WorkshopInfo, VehicleMonthlyReport, VehicleExpense } from '@/types';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  subMonths,
  addMonths,
  isValid,
  getDaysInMonth,
} from "date-fns";
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, DollarSign, Wrench, Calendar, ArrowLeft, Share2, Loader2, Copy, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';


const ReportContent = React.forwardRef<HTMLDivElement, { report: PublicOwnerReport }>(({ report }, ref) => {
  const workshopInfo = report.workshopInfo || { name: 'Taller', logoUrl: '/ranoro-logo.png' };

  return (
    <div ref={ref} className="p-8 font-sans bg-white text-black" data-format="letter">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b-2 border-black pb-4">
        <img src={workshopInfo.logoUrl} alt={`${workshopInfo.name} Logo`} className="h-16 mb-4 sm:mb-0" data-ai-hint="workshop logo" />
        <div className="text-left sm:text-right">
          <h1 className="text-2xl font-bold">Reporte de Ingresos de Flotilla</h1>
          <p className="text-sm">Propietario: <span className="font-semibold">{report.ownerName}</span></p>
          <p className="text-sm">Mes del Reporte: <span className="font-semibold">{report.reportMonth}</span></p>
        </div>
      </header>

      <main>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-center">
          <Card><CardHeader><CardTitle className="text-sm font-medium">Ingreso por Renta</CardTitle><CardDescription className="text-2xl font-bold">{formatCurrency(report.totalRentalIncome)}</CardDescription></CardHeader></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium">Costos y Deducciones</CardTitle><CardDescription className="text-2xl font-bold text-destructive">{formatCurrency(report.totalDeductions)}</CardDescription></CardHeader></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium">Balance Neto</CardTitle><CardDescription className={`text-2xl font-bold ${report.totalNetBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(report.totalNetBalance)}</CardDescription></CardHeader></Card>
        </div>

        <h2 className="text-xl font-semibold mb-4">Desglose por Vehículo</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="font-bold">Vehículo</TableHead>
                    <TableHead className="text-right font-bold">Ingreso Renta</TableHead>
                    <TableHead className="text-right font-bold">Mantenimiento</TableHead>
                    <TableHead className="text-right font-bold">GPS</TableHead>
                    <TableHead className="text-right font-bold">Admin</TableHead>
                    <TableHead className="text-right font-bold">Seguro</TableHead>
                    <TableHead className="text-right font-bold text-primary">Total Deduc.</TableHead>
                    <TableHead className="text-right font-bold">Balance</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {report.detailedReport.map(item => {
                const balance = item.rentalIncome - item.totalDeductions;
                return (
                  <TableRow key={item.vehicleId}>
                    <TableCell className="font-medium">
                      <Link href={`/flotilla/${item.vehicleId}`} className="hover:underline text-primary">
                        {item.vehicleInfo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.rentalIncome)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatCurrency(item.maintenanceAndExpensesCost)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatCurrency(item.gpsMonthlyCost)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatCurrency(item.adminMonthlyCost)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatCurrency(item.insuranceMonthlyCost)}</TableCell>
                    <TableCell className="text-right font-bold text-destructive">{formatCurrency(item.totalDeductions)}</TableCell>
                    <TableCell className={`text-right font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(balance)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </main>
      <footer className="text-xs text-center text-gray-500 mt-8 pt-4 border-t">
        Reporte generado por Ranoro - {format(parseISO(report.generatedDate), "dd/MM/yyyy HH:mm", { locale: es })}
      </footer>
    </div>
  );
});
ReportContent.displayName = "ReportContent";


export default function OwnerIncomeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const ownerName = decodeURIComponent(params.ownerName as string);
  
  const [selectedDate, setSelectedDate] = useState(startOfMonth(new Date()));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReportPreviewOpen, setIsReportPreviewOpen] = useState(false);
  const [reportToPreview, setReportToPreview] = useState<PublicOwnerReport | null>(null);
  const reportContentRef = useRef<HTMLDivElement>(null);

  const handlePreviousMonth = () => setSelectedDate(subMonths(selectedDate, 1));
  const handleNextMonth = () => setSelectedDate(addMonths(selectedDate, 1));

  const ownerVehicles = useMemo(() => {
    return placeholderVehicles.filter(v => v.isFleetVehicle && v.ownerName === ownerName);
  }, [ownerName]);

  const monthlyReportData = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const prevMonthStart = startOfMonth(subMonths(selectedDate, 1));
    const prevMonthEnd = endOfMonth(subMonths(selectedDate, 1));

    const ownerVehicleIds = new Set(ownerVehicles.map(v => v.id));
    const ownerVehiclePlates = new Set(ownerVehicles.map(v => v.licensePlate));

    const allOwnerPayments = placeholderRentalPayments.filter(p => ownerVehiclePlates.has(p.vehicleLicensePlate));
    
    const currentMonthOwnerPayments = allOwnerPayments.filter(p => {
        const pDate = parseISO(p.paymentDate);
        return isValid(pDate) && isWithinInterval(pDate, { start: monthStart, end: monthEnd });
    });
    const prevMonthOwnerPayments = allOwnerPayments.filter(p => {
        const pDate = parseISO(p.paymentDate);
        return isValid(pDate) && isWithinInterval(pDate, { start: prevMonthStart, end: prevMonthEnd });
    });
    
    const currentMonthServices = placeholderServiceRecords.filter(s => {
        if (!ownerVehicleIds.has(s.vehicleId)) return false;
        const sDate = parseISO(s.serviceDate);
        return isValid(sDate) && isWithinInterval(sDate, { start: monthStart, end: monthEnd });
    });

    const currentMonthExpenses = placeholderVehicleExpenses.filter(e => {
        if (!ownerVehicleIds.has(e.vehicleId)) return false;
        const eDate = parseISO(e.date);
        return isValid(eDate) && isWithinInterval(eDate, { start: monthStart, end: monthEnd });
    });

    const currentMonthIncome = currentMonthOwnerPayments.reduce((sum, p) => sum + p.amount, 0);
    const prevMonthIncome = prevMonthOwnerPayments.reduce((sum, p) => sum + p.amount, 0);
    
    const report: VehicleMonthlyReport[] = ownerVehicles.map(vehicle => {
      const vehiclePaymentsInMonth = currentMonthOwnerPayments.filter(p => p.vehicleLicensePlate === vehicle.licensePlate);
      const rentalIncome = vehiclePaymentsInMonth.reduce((sum, p) => sum + p.amount, 0);
      const daysRented = vehiclePaymentsInMonth.reduce((sum, p) => sum + p.daysCovered, 0);
      
      const vehicleServices = currentMonthServices.filter(s => s.vehicleId === vehicle.id);
      const maintenanceCostsFromServices = vehicleServices.reduce((sum, s) => sum + s.totalCost, 0);

      const vehicleExpensesInMonth = currentMonthExpenses.filter(e => e.vehicleId === vehicle.id);
      const costsFromVehicleExpenses = vehicleExpensesInMonth.reduce((sum, e) => sum + e.amount, 0);
      
      const maintenanceAndExpensesCost = maintenanceCostsFromServices + costsFromVehicleExpenses;
      
      // Use nullish coalescing (??) to apply defaults only if the property is undefined or null
      // This respects a value of 0 if it's explicitly set on the vehicle.
      const gpsMonthlyCost = vehicle.gpsMonthlyCost ?? 150;
      const adminMonthlyCost = vehicle.adminMonthlyCost ?? 200;
      const insuranceMonthlyCost = vehicle.insuranceMonthlyCost ?? 250;
      
      const totalDeductions = maintenanceAndExpensesCost + gpsMonthlyCost + adminMonthlyCost + insuranceMonthlyCost;
      
      return {
        vehicleId: vehicle.id,
        vehicleInfo: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
        daysRented,
        rentalIncome,
        maintenanceAndExpensesCost,
        gpsMonthlyCost,
        adminMonthlyCost,
        insuranceMonthlyCost,
        totalDeductions,
      };
    });

    return {
      currentMonthIncome,
      prevMonthIncome,
      detailedReport: report,
    };
  }, [selectedDate, ownerVehicles]);

  const handleGenerateReport = () => {
    setIsGenerating(true);
    
    const storedWorkshopInfo = typeof window !== 'undefined' ? localStorage.getItem('workshopTicketInfo') : null;
    const workshopInfo: WorkshopInfo | undefined = storedWorkshopInfo ? JSON.parse(storedWorkshopInfo) : undefined;
  
    try {
        const totalRentalIncome = monthlyReportData.detailedReport.reduce((sum, r) => sum + r.rentalIncome, 0);
        const totalDeductions = monthlyReportData.detailedReport.reduce((sum, r) => sum + r.totalDeductions, 0);
        const totalNetBalance = totalRentalIncome - totalDeductions;

        const reportForPreview: PublicOwnerReport = {
            publicId: `local-preview-${Date.now()}`,
            ownerName: ownerName,
            generatedDate: new Date().toISOString(),
            reportMonth: format(selectedDate, "MMMM 'de' yyyy", { locale: es }),
            detailedReport: monthlyReportData.detailedReport,
            totalRentalIncome,
            totalDeductions,
            totalNetBalance,
            workshopInfo,
        };
        
        setReportToPreview(reportForPreview);
        setIsReportPreviewOpen(true);

    } catch (e) {
       console.error("Error generating local report preview:", e);
       toast({ title: "Error al Generar Reporte", description: `No se pudo generar la vista previa del reporte.`, variant: "destructive" });
    } finally {
        setIsGenerating(false);
    }
  };
  
  const handleCopyAsImage = async () => {
    if (!reportContentRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    try {
        const canvas = await html2canvas(reportContentRef.current, { scale: 2 });
        canvas.toBlob((blob) => {
            if (blob) {
                navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                toast({ title: "Copiado", description: "La imagen del reporte ha sido copiada." });
            }
        });
    } catch (e) {
        console.error("Error copying image:", e);
        toast({ title: "Error", description: "No se pudo copiar la imagen del reporte.", variant: "destructive" });
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportContentRef.current || !reportToPreview) return;
    const html2pdf = (await import('html2pdf.js')).default;
    const element = reportContentRef.current;
    const pdfFileName = `Reporte_Flotilla_${reportToPreview.ownerName}_${reportToPreview.reportMonth}.pdf`.replace(/ /g, '_');
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


  return (
    <>
      <PageHeader
        title={`Reporte de Ingresos para ${ownerName}`}
        description="Análisis de los ingresos y costos de la flotilla de este propietario."
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver
            </Button>
            <Button onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
              Reporte Mensual
            </Button>
          </div>
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos de Flotilla (Mes Actual)</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{formatCurrency(monthlyReportData.currentMonthIncome)}</div>
            <p className="text-xs text-muted-foreground">{format(selectedDate, "MMMM yyyy", { locale: es })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos de Flotilla (Mes Anterior)</CardTitle>
            <DollarSign className="h-5 w-5 text-gray-500"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{formatCurrency(monthlyReportData.prevMonthIncome)}</div>
            <p className="text-xs text-muted-foreground">{format(subMonths(selectedDate, 1), "MMMM yyyy", { locale: es })}</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle>Informe Mensual Detallado</CardTitle>
              <CardDescription>Desglose de ingresos y costos por vehículo para el mes seleccionado.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-center w-32">{format(selectedDate, "MMMM yyyy", { locale: es })}</span>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Vehículo</TableHead>
                  <TableHead className="text-right font-bold">Ingresos por Renta</TableHead>
                  <TableHead className="text-right font-bold">Costos y Deducc.</TableHead>
                  <TableHead className="text-right font-bold">Balance Neto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyReportData.detailedReport.map(item => {
                  const balance = item.rentalIncome - item.totalDeductions;
                  return (
                    <TableRow key={item.vehicleId}>
                      <TableCell className="font-medium">
                        <Link href={`/flotilla/${item.vehicleId}`} className="hover:underline text-primary">
                          {item.vehicleInfo}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.rentalIncome)}</TableCell>
                      <TableCell className="text-right text-destructive">
                          <span className="font-semibold">{formatCurrency(item.totalDeductions)}</span>
                          <div className="text-xs font-normal text-muted-foreground">
                              Mto: {formatCurrency(item.maintenanceAndExpensesCost)}
                          </div>
                      </TableCell>
                      <TableCell className={`text-right font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(balance)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {isReportPreviewOpen && reportToPreview && (
        <PrintTicketDialog
          open={isReportPreviewOpen}
          onOpenChange={setIsReportPreviewOpen}
          title="Vista Previa de Reporte"
          dialogContentClassName="printable-quote-dialog max-w-4xl"
          footerActions={
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleCopyAsImage}>
                <Copy className="mr-2 h-4 w-4" /> Copiar Imagen
              </Button>
              <Button onClick={handleDownloadPDF}>
                <Download className="mr-2 h-4 w-4" /> Descargar PDF
              </Button>
            </div>
          }
        >
          <ReportContent report={reportToPreview} ref={reportContentRef} />
        </PrintTicketDialog>
      )}
    </>
  );
}
