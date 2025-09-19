
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { calculateSaleProfit } from '@/lib/placeholder-data';
import type { User, CapacityAnalysisOutput, ServiceRecord, SaleReceipt, InventoryItem, Personnel, MonthlyFixedExpense, Driver, Vehicle, PaymentMethod } from '@/types';
import { BrainCircuit, Loader2, Wrench, DollarSign, AlertTriangle, Receipt, Truck } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { analyzeWorkshopCapacity } from '@/ai/flows/capacity-analysis-flow';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { serviceService, saleService, inventoryService, personnelService, rentalService } from '@/lib/services';
import { parseDate } from '@/lib/forms';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { isValid, isToday, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { DashboardCharts } from './components/DashboardCharts';
import { toZonedTime } from 'date-fns-tz';
import { GlobalTransactionDialog, GlobalTransactionFormValues } from '../flotilla/components/GlobalTransactionDialog';

const TZ = "America/Mexico_City";

const getDeliveredAt = (s: ServiceRecord): Date | null => {
  return (
    parseDate((s as any).deliveryDateTime) ||
    parseDate((s as any).completedAt) ||
    parseDate((s as any).closedAt) ||
    (Array.isArray(s.payments) && s.payments.length
      ? parseDate(s.payments[0]?.date)
      : null) ||
    parseDate((s as any).serviceDate)
  );
};

const sumPaymentsBetween = (
  s: ServiceRecord,
  dayStart: Date,
  dayEnd: Date
): number => {
  if (!Array.isArray(s.payments)) return 0;
  return s.payments.reduce((acc, p) => {
    const pd = parseDate((p as any).date);
    if (!pd || !isValid(pd)) return acc;
    const pdZ = toZonedTime(pd, TZ);
    return isWithinInterval(pdZ, { start: dayStart, end: dayEnd })
      ? acc + (Number(p.amount) || 0)
      : acc;
  }, 0);
};

export default function DashboardPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const { toast } = useToast();
  
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<MonthlyFixedExpense[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const [capacityInfo, setCapacityInfo] = useState<CapacityAnalysisOutput | null>(null);
  const [isCapacityLoading, setIsCapacityLoading] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);

  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  
  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      serviceService.onServicesUpdate(setAllServices),
      saleService.onSalesUpdate(setAllSales),
      inventoryService.onItemsUpdate(setAllInventory),
      inventoryService.onFixedExpensesUpdate(setFixedExpenses),
      personnelService.onPersonnelUpdate(setAllPersonnel),
      personnelService.onDriversUpdate(setDrivers),
      inventoryService.onVehiclesUpdate((vehicles) => {
        setVehicles(vehicles);
        setIsLoading(false);
      }),
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const kpiData = useMemo(() => {
    const nowZ = toZonedTime(new Date(), TZ);
    const dayStart = startOfDay(nowZ);
    const dayEnd = endOfDay(nowZ);

    const salesToday = allSales.filter((s) => {
      const d = parseDate(s.saleDate);
      if (!d || !isValid(d)) return false;
      const dz = toZonedTime(d, TZ);
      return s.status !== "Cancelado" && isWithinInterval(dz, { start: dayStart, end: dayEnd });
    });

    const servicesCompletedToday = allServices.filter((s) => {
      if (s.status !== "Entregado") return false;
      const d = getDeliveredAt(s);
      if (!d || !isValid(d)) return false;
      const dz = toZonedTime(d, TZ);
      return isWithinInterval(dz, { start: dayStart, end: dayEnd });
    });

    const revenueFromSales = salesToday.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    const revenueFromServices = servicesCompletedToday.reduce((sum, s) => {
      const tc = Number(s.totalCost);
      const value =
        Number.isFinite(tc) && tc > 0 ? tc : sumPaymentsBetween(s, dayStart, dayEnd);
      return sum + value;
    }, 0);

    const profitFromSales = salesToday.reduce(
      (sum, s) => sum + calculateSaleProfit(s, allInventory),
      0
    );

    const profitFromServices = servicesCompletedToday.reduce(
      (sum, s) => sum + (Number(s.serviceProfit) || 0),
      0
    );

    const repairingServices = allServices.filter((s) => s.status === "En Taller");
    const scheduledTodayServices = allServices.filter((s) => {
      if (s.status !== "Agendado") return false;
      const d = parseDate(s.serviceDate);
      if (!d || !isValid(d)) return false;
      const dz = toZonedTime(d, TZ);
      return isWithinInterval(dz, { start: dayStart, end: dayEnd });
    });

    return {
      dailyRevenue: revenueFromSales + revenueFromServices,
      dailyProfit: profitFromSales + profitFromServices,
      activeServices: repairingServices.length + scheduledTodayServices.length + servicesCompletedToday.length,
      lowStockAlerts: allInventory.filter((i) => !i.isService && (i.quantity || 0) <= (i.lowStockThreshold || 0)).length,
    };
  }, [allServices, allSales, allInventory]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      if (authUserString) {
        try {
          const authUser: User = JSON.parse(authUserString);
          setUserName(authUser.name);
        } catch (e) {
          console.error('Failed to parse authUser for dashboard welcome message:', e);
        }
      }
    }
  }, []);
  
  const runCapacityAnalysis = useCallback(async () => {
    if (allServices.length === 0 || allPersonnel.length === 0) {
      toast({ title: 'Datos insuficientes', description: 'Se necesitan servicios y personal para analizar la capacidad.', variant: 'default' });
      return;
    }
    
    setIsCapacityLoading(true);
    setCapacityError(null);
    
    try {
      const servicesForToday = allServices.filter(s => {
        const serviceDay = parseDate(s.serviceDate);
        return (s.status === 'En Taller') || (s.status === 'Agendado' && serviceDay && isValid(serviceDay) && isToday(serviceDay));
      });

      if (servicesForToday.length === 0) {
          const totalAvailable = allPersonnel.filter(p => !p.isArchived).reduce((sum, t) => sum + (t.standardHoursPerDay || 8), 0);
          setCapacityInfo({ totalRequiredHours: 0, totalAvailableHours: totalAvailable, recommendation: 'Taller disponible', capacityPercentage: 0 });
          return;
      }

      const result = await analyzeWorkshopCapacity({
          servicesForDay: servicesForToday.map(s => ({ description: s.description || '' })),
          technicians: allPersonnel.filter(p => !p.isArchived).map(t => ({ id: t.id, standardHoursPerDay: t.standardHoursPerDay || 8 })),
          serviceHistory: allServices
            .filter(s => s.serviceDate)
            .map(s => {
                const serviceDate = parseDate(s.serviceDate);
                const deliveryDateTime = parseDate(s.deliveryDateTime);
                return {
                    description: s.description || '',
                    serviceDate: serviceDate ? serviceDate.toISOString() : undefined,
                    deliveryDateTime: deliveryDateTime ? deliveryDateTime.toISOString() : undefined,
                };
            }),
      });
      setCapacityInfo(result);
    } catch (e: any) {
      setCapacityError(e.message || 'Error en análisis de capacidad');
    } finally {
      setIsCapacityLoading(false);
    }
  }, [allServices, allPersonnel, toast]);

  const handleSaveTransaction = async (values: GlobalTransactionFormValues) => {
    try {
        const driver = drivers.find(d => d.id === values.driverId);
        if (!driver) throw new Error("Driver not found.");

        const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
        if (!vehicle) throw new Error("Vehicle not found for payment.");
        await rentalService.addRentalPayment(driver, vehicle, values.amount, values.note, values.date, values.paymentMethod as PaymentMethod);
        toast({ title: "Pago Registrado" });
        setIsTransactionDialogOpen(false);
    } catch (error) {
        toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!isLoading) {
      runCapacityAnalysis();
    }
  }, [isLoading, runCapacityAnalysis]);


  return (
    <>
      <div className="container mx-auto py-8 flex flex-col">
        <PageHeader
          title={userName ? `¡Bienvenido, ${userName}!` : 'Panel Principal de Taller'}
          description="Vista del estado actual de los servicios y herramientas de IA."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="w-full sm:w-auto bg-white border-red-500 text-black font-bold hover:bg-red-50">
                <Link href="/servicios/nuevo">
                  <Wrench className="mr-2 h-4 w-4 text-red-500" />
                  Nuevo Servicio
                </Link>
              </Button>
               <Button asChild variant="outline" className="w-full sm:w-auto bg-white border-blue-500 text-black font-bold hover:bg-blue-50">
                <Link href="/pos/nuevo">
                  <Receipt className="mr-2 h-4 w-4 text-blue-500" />
                  Punto de Venta
                </Link>
              </Button>
              <Button variant="outline" className="w-full sm:w-auto bg-white border-orange-500 text-black font-bold hover:bg-orange-50" onClick={() => setIsTransactionDialogOpen(true)}>
                <Truck className="mr-2 h-4 w-4 text-orange-600" />
                Pago de Flotilla
              </Button>
            </div>
          }
        />

         <div className="mb-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos del Día</CardTitle>
              <DollarSign className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-3/4" /> : <div className="text-2xl font-bold font-headline">{formatCurrency(kpiData.dailyRevenue)}</div>}
              {isLoading ? <Skeleton className="h-4 w-1/2 mt-1" /> : <p className="text-xs text-muted-foreground">Ganancia del día: {formatCurrency(kpiData.dailyProfit)}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Servicios Activos (Hoy)</CardTitle>
              <Wrench className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold font-headline">{kpiData.activeServices}</div>}
              {isLoading ? <Skeleton className="h-4 w-3/4 mt-1" /> : <p className="text-xs text-muted-foreground">Reparando, agendados y entregados hoy</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alertas de Stock Bajo</CardTitle>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold font-headline">{kpiData.lowStockAlerts}</div>}
              {isLoading ? <Skeleton className="h-4 w-2/3 mt-1" /> : <p className="text-xs text-muted-foreground">Ítems que necesitan reposición</p>}
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
                    <Skeleton className="h-8 w-3/4 mt-1" />
                ) : capacityInfo ? (
                    <>
                        <div className="text-2xl font-bold font-headline">{capacityInfo.capacityPercentage}%</div>
                        <p className="text-xs text-muted-foreground" title={`${capacityInfo.totalRequiredHours.toFixed(1)}h de ${capacityInfo.totalAvailableHours}h`}>
                            {capacityInfo.recommendation}
                        </p>
                    </>
                ) : capacityError ? (
                     <div className="flex items-center gap-2 pt-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="text-sm">{capacityError}</span>
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground mt-2">Analizando capacidad...</p>
                )}
            </CardContent>
          </Card>
        </div>

        <DashboardCharts 
          services={allServices} 
          sales={allSales}
          inventory={allInventory}
          fixedExpenses={fixedExpenses}
          personnel={allPersonnel}
        />

      </div>
      <GlobalTransactionDialog
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
        onSave={handleSaveTransaction}
        transactionType="payment"
        drivers={drivers.filter(d => !d.isArchived)}
    />
    </>
  );
}
