
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { format, parseISO, isToday, isValid, isSameDay } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { placeholderServiceRecords, placeholderInventory, placeholderSales, calculateSaleProfit, placeholderTechnicians, persistToFirestore, placeholderVehicles } from "@/lib/placeholder-data";
import type { User, CapacityAnalysisOutput, PurchaseRecommendation } from "@/types";
import { BrainCircuit, Loader2, ShoppingCart, AlertTriangle, Printer, Wrench, DollarSign } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { getPurchaseRecommendations } from '@/ai/flows/purchase-recommendation-flow';
import { analyzeWorkshopCapacity } from '@/ai/flows/capacity-analysis-flow';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { PurchaseOrderContent } from './components/purchase-order-content';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const ChartLoadingSkeleton = () => (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 mt-6">
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[250px] text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
            </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[250px] text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[250px] text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        </div>
    </div>
);

const DashboardCharts = dynamic(
  () => import('./components/dashboard-charts').then((mod) => mod.DashboardCharts),
  { 
    ssr: false,
    loading: () => <ChartLoadingSkeleton />,
  }
);


const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function DashboardPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const { toast } = useToast();
  
  const [purchaseRecommendations, setPurchaseRecommendations] = useState<PurchaseRecommendation[] | null>(null);
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isPurchaseOrderDialogOpen, setIsPurchaseOrderDialogOpen] = useState(false);
  const [workshopName, setWorkshopName] = useState<string>('RANORO');

  const purchaseOrderRef = useRef<HTMLDivElement>(null);

  const [kpiData, setKpiData] = useState({
    dailyRevenue: 0,
    dailyProfit: 0,
    activeServices: 0,
    lowStockAlerts: 0,
  });

  const [capacityInfo, setCapacityInfo] = useState<CapacityAnalysisOutput | null>(null);
  const [isCapacityLoading, setIsCapacityLoading] = useState(true);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  
  const calculateKpiData = useCallback(() => {
    const clientToday = new Date();
    
    const repairingServices = placeholderServiceRecords.filter(s => s.status === 'Reparando');
    const scheduledTodayServices = placeholderServiceRecords.filter(s => {
      if (s.status !== 'Agendado') return false;
      const serviceDay = parseISO(s.serviceDate);
      return isValid(serviceDay) && isToday(serviceDay);
    });

    const salesToday = placeholderSales.filter(s => isSameDay(parseISO(s.saleDate), clientToday));
    const servicesCompletedToday = placeholderServiceRecords.filter(s => s.status === 'Completado' && s.deliveryDateTime && isSameDay(parseISO(s.deliveryDateTime), clientToday));
    
    const revenueFromSales = salesToday.reduce((sum, s) => sum + s.totalAmount, 0);
    const revenueFromServices = servicesCompletedToday.reduce((sum, s) => sum + s.totalCost, 0);
    
    const profitFromSales = salesToday.reduce((sum, s) => sum + calculateSaleProfit(s, placeholderInventory), 0);
    const profitFromServices = servicesCompletedToday.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);

    setKpiData({
        dailyRevenue: revenueFromSales + revenueFromServices,
        dailyProfit: profitFromSales + profitFromServices,
        activeServices: repairingServices.length + scheduledTodayServices.length,
        lowStockAlerts: placeholderInventory.filter(item => !item.isService && item.quantity <= item.lowStockThreshold).length
    });
  }, []);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authUserString = localStorage.getItem('authUser');
      if (authUserString) {
        try {
          const authUser: User = JSON.parse(authUserString);
          setUserName(authUser.name);
        } catch (e) {
          console.error("Failed to parse authUser for dashboard welcome message:", e);
          setUserName(null);
        }
      } else {
         setUserName(null);
      }
      const stored = localStorage.getItem('workshopTicketInfo');
      if (stored) {
        try {
          const info = JSON.parse(stored);
          if (info.name) setWorkshopName(info.name);
        } catch (e) {
          console.error("Failed to parse workshop info", e);
        }
      }
    }
    calculateKpiData();
  }, [calculateKpiData]);
  
  useEffect(() => {
    const runCapacityAnalysis = async () => {
      setIsCapacityLoading(true);
      setCapacityError(null);
      try {
        const servicesForToday = placeholderServiceRecords.filter(s => {
          const serviceDay = parseISO(s.serviceDate);
          return isValid(serviceDay) && isToday(serviceDay) && s.status !== 'Completado' && s.status !== 'Cancelado';
        });

        if (servicesForToday.length === 0) {
            const totalAvailable = placeholderTechnicians
                .filter(t => !t.isArchived)
                .reduce((sum, t) => sum + (t.standardHoursPerDay || 8), 0);
            
            setCapacityInfo({
                totalRequiredHours: 0,
                totalAvailableHours: totalAvailable,
                capacityPercentage: 0,
                recommendation: "Taller disponible",
            });
            setIsCapacityLoading(false);
            return;
        }

        const result = await analyzeWorkshopCapacity({
            servicesForDay: servicesForToday.map(s => ({ description: s.description })),
            technicians: placeholderTechnicians.filter(t => !t.isArchived).map(t => ({ id: t.id, standardHoursPerDay: t.standardHoursPerDay || 8 })),
            serviceHistory: placeholderServiceRecords.map(s => ({
                description: s.description,
                serviceDate: s.serviceDate,
                deliveryDateTime: s.deliveryDateTime,
            })),
        });
        setCapacityInfo(result);
      } catch (e) {
        console.error("Capacity analysis failed on dashboard:", e);
        setCapacityError("La IA no pudo calcular la capacidad.");
      } finally {
        setIsCapacityLoading(false);
      }
    };
    runCapacityAnalysis();
  }, []);
  
  const handleGeneratePurchaseOrder = async () => {
    setIsPurchaseLoading(true);
    setPurchaseError(null);
    setPurchaseRecommendations(null);

    try {
      const today = new Date();
      const servicesForToday = placeholderServiceRecords.filter(s => {
        const serviceDay = parseISO(s.serviceDate);
        return isValid(serviceDay) && isToday(serviceDay) && s.status !== 'Completado' && s.status !== 'Cancelado';
      });

      if (servicesForToday.length === 0) {
        toast({ title: "No hay servicios", description: "No hay servicios agendados para hoy que requieran compras.", variant: 'default' });
        setIsPurchaseLoading(false);
        return;
      }
      
      const input = {
        scheduledServices: servicesForToday.map(s => ({ id: s.id, description: s.description })),
        inventoryItems: placeholderInventory.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, supplier: i.supplier })),
        serviceHistory: placeholderServiceRecords.map(s => ({
            description: s.description,
            suppliesUsed: s.suppliesUsed.map(sup => ({ supplyName: sup.supplyName || placeholderInventory.find(i => i.id === sup.supplyId)?.name || 'Unknown' }))
        }))
      };

      const result = await getPurchaseRecommendations(input);
      setPurchaseRecommendations(result.recommendations);
      toast({ title: "Orden de Compra Generada", description: result.reasoning, duration: 6000 });
      setIsPurchaseOrderDialogOpen(true);

    } catch (e) {
      console.error(e);
      setPurchaseError("La IA no pudo generar la orden de compra. Por favor, inténtelo de nuevo más tarde.");
      toast({
        title: "Error de IA",
        description: "No se pudo generar la orden de compra.",
        variant: "destructive"
      });
    } finally {
      setIsPurchaseLoading(false);
    }
  };


  return (
    <div className="container mx-auto py-8 flex flex-col">
      <PageHeader
        title={userName ? `¡Bienvenido, ${userName}!` : "Panel Principal de Taller"}
        description="Vista del estado actual de los servicios y herramientas de IA."
      />

       <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos del Día</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{formatCurrency(kpiData.dailyRevenue)}</div>
            <p className="text-xs text-muted-foreground">Ganancia del día: {formatCurrency(kpiData.dailyProfit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Servicios Activos (Hoy)</CardTitle>
            <Wrench className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{kpiData.activeServices}</div>
            <p className="text-xs text-muted-foreground">Reparando y agendados para hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas de Stock Bajo</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{kpiData.lowStockAlerts}</div>
            <p className="text-xs text-muted-foreground">Ítems que necesitan reposición</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                  Capacidad del Taller (Hoy)
              </CardTitle>
              <BrainCircuit className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
              {isCapacityLoading ? (
                  <div className="flex items-center gap-2 pt-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-muted-foreground text-sm">Calculando...</span>
                  </div>
              ) : capacityError ? (
                  <div className="flex items-center gap-2 pt-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="text-sm">{capacityError}</span>
                  </div>
              ) : capacityInfo ? (
                  <>
                      <div className="text-2xl font-bold font-headline">{capacityInfo.capacityPercentage}%</div>
                      <p className="text-xs text-muted-foreground" title={`${capacityInfo.totalRequiredHours}h de ${capacityInfo.totalAvailableHours}h`}>
                          {capacityInfo.recommendation}
                      </p>
                  </>
              ) : (
                  <p className="text-xs text-muted-foreground pt-2">No hay datos de capacidad.</p>
              )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-6 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BrainCircuit className="h-5 w-5 text-purple-500" />
              Asistente de Compras IA
            </CardTitle>
            <CardDescription>
              Genera una orden de compra consolidada para los servicios de hoy.
            </CardDescription>
          </div>
          <Button onClick={handleGeneratePurchaseOrder} disabled={isPurchaseLoading}>
            {isPurchaseLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
            {isPurchaseLoading ? 'Analizando...' : 'Generar Orden de Compra'}
          </Button>
        </CardHeader>
        {purchaseError && (
          <CardContent>
            <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm">{purchaseError}</span>
            </div>
          </CardContent>
        )}
      </Card>
      
      <DashboardCharts />

      {purchaseRecommendations && (
        <PrintTicketDialog
            open={isPurchaseOrderDialogOpen}
            onOpenChange={setIsPurchaseOrderDialogOpen}
            title="Orden de Compra Sugerida por IA"
            onDialogClose={() => setPurchaseRecommendations(null)}
            dialogContentClassName="printable-quote-dialog"
            footerActions={
              <Button onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimir Orden
              </Button>
            }
          >
            <PurchaseOrderContent
              ref={purchaseOrderRef}
              recommendations={purchaseRecommendations}
              workshopName={workshopName}
            />
        </PrintTicketDialog>
      )}
    </div>
  );
}
