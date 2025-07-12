
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { parseISO, isToday, isValid, isSameDay } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AUTH_USER_LOCALSTORAGE_KEY, calculateSaleProfit } from "@/lib/placeholder-data";
import type { User, CapacityAnalysisOutput, PurchaseRecommendation, ServiceRecord, SaleReceipt, InventoryItem, Technician } from "@/types";
import { BrainCircuit, Loader2, ShoppingCart, AlertTriangle, Printer, Wrench, DollarSign, PackageSearch, CheckCircle } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { getPurchaseRecommendations } from '@/ai/flows/purchase-recommendation-flow';
import { analyzeWorkshopCapacity } from '@/ai/flows/capacity-analysis-flow';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { PurchaseOrderContent } from './components/purchase-order-content';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { analyzeInventory, type InventoryRecommendation } from '@/ai/flows/inventory-analysis-flow';
import { ScrollArea } from "@/components/ui/scroll-area";
import { operationsService, inventoryService, personnelService } from '@/lib/services';


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

const handleAiError = (error: any, toast: any, context: string): string => {
    console.error(`AI Error in ${context}:`, error);
    let message = `La IA no pudo completar la acción de ${context}.`;
    if (error instanceof Error && error.message.includes('503')) {
        message = "El modelo de IA está sobrecargado. Por favor, inténtelo de nuevo más tarde.";
    }
    toast({ title: "Error de IA", description: message, variant: "destructive" });
    return message; // Return the user-friendly message
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
  
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<InventoryRecommendation[] | null>(null);

  // States for real-time data
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [kpiData, setKpiData] = useState({
    dailyRevenue: 0,
    dailyProfit: 0,
    activeServices: 0,
    lowStockAlerts: 0,
  });

  const [capacityInfo, setCapacityInfo] = useState<CapacityAnalysisOutput | null>(null);
  const [isCapacityLoading, setIsCapacityLoading] = useState(true);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  
  // Real-time data subscriptions
  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      operationsService.onServicesUpdate(setAllServices),
      operationsService.onSalesUpdate(setAllSales),
      inventoryService.onItemsUpdate(setAllInventory),
      personnelService.onTechniciansUpdate((techs) => {
        setAllTechnicians(techs);
        setIsLoading(false); // Mark as loaded after last subscription is set up
      })
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const calculateKpiData = useCallback(() => {
    const clientToday = new Date();
    
    const repairingServices = allServices.filter(s => s.status === 'Reparando');
    const scheduledTodayServices = allServices.filter(s => {
      if (s.status !== 'Agendado' || !s.serviceDate || typeof s.serviceDate !== 'string') return false;
      const serviceDay = parseISO(s.serviceDate);
      return isValid(serviceDay) && isToday(serviceDay);
    });

    const salesToday = allSales.filter(s => s.saleDate && isValid(parseISO(s.saleDate)) && isSameDay(parseISO(s.saleDate), clientToday));
    const servicesCompletedToday = allServices.filter(s => s.status === 'Completado' && s.deliveryDateTime && isValid(parseISO(s.deliveryDateTime)) && isSameDay(parseISO(s.deliveryDateTime), clientToday));
    
    const revenueFromSales = salesToday.reduce((sum, s) => sum + s.totalAmount, 0);
    const revenueFromServices = servicesCompletedToday.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    
    const profitFromSales = salesToday.reduce((sum, s) => sum + calculateSaleProfit(s, allInventory), 0);
    const profitFromServices = servicesCompletedToday.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);

    setKpiData({
        dailyRevenue: revenueFromSales + revenueFromServices,
        dailyProfit: profitFromSales + profitFromServices,
        activeServices: repairingServices.length + scheduledTodayServices.length,
        lowStockAlerts: allInventory.filter(item => !item.isService && item.quantity <= item.lowStockThreshold).length
    });
  }, [allServices, allSales, allInventory]);


  useEffect(() => {
    if (!isLoading) {
      calculateKpiData();
    }
    if (typeof window !== 'undefined') {
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
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
        } catch (e) { console.error("Failed to parse workshop info", e); }
      }
    }
  }, [isLoading, calculateKpiData]);
  
  useEffect(() => {
    const runCapacityAnalysis = async () => {
      if (isLoading) return;
      setIsCapacityLoading(true);
      setCapacityError(null);
      try {
        const servicesForToday = allServices.filter(s => {
          if (!s.serviceDate || typeof s.serviceDate !== 'string') return false;
          const serviceDay = parseISO(s.serviceDate);
          return isValid(serviceDay) && isToday(serviceDay) && s.status !== 'Completado' && s.status !== 'Cancelado';
        });

        if (servicesForToday.length === 0) {
            const totalAvailable = allTechnicians
                .filter(t => !t.isArchived)
                .reduce((sum, t) => sum + (t.standardHoursPerDay || 8), 0);
            
            setCapacityInfo({
                totalRequiredHours: 0,
                totalAvailableHours: totalAvailable,
                recommendation: "Taller disponible",
                capacityPercentage: 0,
            });
            setIsCapacityLoading(false);
            return;
        }

        const result = await analyzeWorkshopCapacity({
            servicesForDay: servicesForToday.map(s => ({ description: s.description || '' })),
            technicians: allTechnicians.filter(t => !t.isArchived).map(t => ({ id: t.id, standardHoursPerDay: t.standardHoursPerDay || 8 })),
            serviceHistory: allServices
              .filter(s => s.serviceDate && typeof s.serviceDate === 'string')
              .map(s => ({
                description: s.description || '',
                serviceDate: s.serviceDate,
                // Only include deliveryDateTime if it's a valid string
                ...(s.deliveryDateTime && { deliveryDateTime: s.deliveryDateTime }),
            })),
        });
        setCapacityInfo(result);
      } catch (e) {
        setCapacityError(handleAiError(e, toast, 'análisis de capacidad'));
      } finally {
        setIsCapacityLoading(false);
      }
    };
    runCapacityAnalysis();
  }, [toast, allServices, allTechnicians, isLoading]);
  
  const handleGeneratePurchaseOrder = async () => {
    setIsPurchaseLoading(true);
    setPurchaseError(null);
    setPurchaseRecommendations(null);

    try {
      const servicesForToday = allServices.filter(s => {
        if (!s.serviceDate || typeof s.serviceDate !== 'string') return false;
        const serviceDay = parseISO(s.serviceDate);
        return isValid(serviceDay) && isToday(serviceDay) && s.status !== 'Completado' && s.status !== 'Cancelado';
      });

      if (servicesForToday.length === 0) {
        toast({ title: "No hay servicios", description: "No hay servicios agendados para hoy que requieran compras.", variant: 'default' });
        setIsPurchaseLoading(false);
        return;
      }
      
      const input = {
        scheduledServices: servicesForToday.map(s => ({ id: s.id, description: s.description || '' })),
        inventoryItems: allInventory.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, supplier: i.supplier })),
        serviceHistory: allServices.map(s => ({
            description: s.description || '',
            suppliesUsed: (s.serviceItems || []).flatMap(item => item.suppliesUsed || []).map(sup => ({ supplyName: sup.supplyName || allInventory.find(i => i.id === sup.supplyId)?.name || 'Unknown' }))
        }))
      };

      const result = await getPurchaseRecommendations(input);
      setPurchaseRecommendations(result.recommendations);
      toast({ title: "Orden de Compra Generada", description: result.reasoning, duration: 6000 });
      setIsPurchaseOrderDialogOpen(true);

    } catch (e) {
      setPurchaseError(handleAiError(e, toast, 'recomendación de compra'));
    } finally {
      setIsPurchaseLoading(false);
    }
  };
  
  const handleRunAnalysis = async () => {
    setIsAnalysisLoading(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const inventoryForAI = allInventory.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
      }));

      const servicesForAI = allServices.map(service => ({
        serviceDate: service.serviceDate,
        suppliesUsed: (service.serviceItems || []).flatMap(item => item.suppliesUsed || []).map(supply => ({
          supplyId: supply.supplyId,
          quantity: supply.quantity,
        })),
      }));

      const result = await analyzeInventory({
        inventoryItems: inventoryForAI,
        serviceRecords: servicesForAI,
      });

      setAnalysisResult(result.recommendations);
      toast({
        title: "Análisis Completado",
        description: `La IA ha generado ${result.recommendations.length} recomendaciones.`,
        variant: "default"
      });

    } catch (e) {
      setAnalysisError(handleAiError(e, toast, 'análisis de inventario'));
    } finally {
      setIsAnalysisLoading(false);
    }
  };


  return (
    <div className="container mx-auto py-8 flex flex-col">
      <PageHeader
        title={userName ? `¡Bienvenido, ${userName}!` : "Panel Principal de Taller"}
        description="Vista del estado actual de los servicios y herramientas de IA."
      />

       <div className="mb-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
                      <p className="text-xs text-muted-foreground" title={`${capacityInfo.totalRequiredHours.toFixed(1)}h de ${capacityInfo.totalAvailableHours}h`}>
                          {capacityInfo.recommendation}
                      </p>
                  </>
              ) : (
                  <p className="text-xs text-muted-foreground pt-2">No hay datos de capacidad.</p>
              )}
          </CardContent>
        </Card>
      </div>
      
      <DashboardCharts />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="shadow-lg">
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
              {isPurchaseLoading ? 'Analizando...' : 'Generar Orden'}
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
         <Card className="shadow-lg flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <BrainCircuit className="h-5 w-5 text-purple-500" />
                    Análisis de Inventario IA
                </CardTitle>
                <CardDescription>
                    Obtén recomendaciones inteligentes sobre qué reordenar.
                </CardDescription>
                </div>
                <Button onClick={handleRunAnalysis} disabled={isAnalysisLoading}>
                {isAnalysisLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit className="mr-2 h-4 w-4" />}
                {isAnalysisLoading ? 'Analizando...' : 'Analizar'}
                </Button>
            </CardHeader>
            <CardContent className="flex-grow">
                {isAnalysisLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p>La IA está revisando tu inventario...</p>
                </div>
                ) : analysisError ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-destructive-foreground bg-destructive/10 p-8 rounded-lg">
                    <AlertTriangle className="h-12 w-12 mb-4"/>
                    <p className="font-medium">Ocurrió un Error</p>
                    <p className="text-sm mt-1">{analysisError}</p>
                </div>
                ) : analysisResult ? (
                    analysisResult.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-green-50/50 border-green-200 rounded-lg">
                        <CheckCircle className="h-12 w-12 text-green-600 mb-4"/>
                        <p className="font-bold text-green-800">¡Todo en orden!</p>
                        <p className="text-sm text-green-700 mt-1">
                            Tu inventario está saludable. No se requieren compras inmediatas.
                        </p>
                    </div>
                    ) : (
                    <ScrollArea className="h-[200px] pr-3">
                        <div className="space-y-3">
                            {analysisResult.map((rec) => (
                                <Card key={rec.itemId} className="bg-muted/30">
                                    <CardHeader className="p-3">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                                            {rec.itemName}
                                        </CardTitle>
                                        <CardDescription className="text-xs">{rec.recommendation}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0">
                                        <p className="text-xs text-muted-foreground mb-2">{rec.reasoning}</p>
                                        <div className="flex justify-between items-center bg-background p-2 rounded-md">
                                            <span className="font-medium text-xs">Sugerencia de compra:</span>
                                            <span className="font-bold text-base text-primary flex items-center gap-1">
                                                <ShoppingCart className="h-4 w-4"/>
                                                {rec.suggestedReorderQuantity}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                    )
                ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                    <PackageSearch className="h-12 w-12 mb-4"/>
                    <p>Listo para analizar tu inventario.</p>
                </div>
                )}
            </CardContent>
            </Card>
      </div>

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
