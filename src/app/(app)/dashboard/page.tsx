// src/app/(app)/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { calculateSaleProfit, calcEffectiveProfit } from '@/lib/money-helpers';
import type { User, ServiceRecord, SaleReceipt, InventoryItem, Personnel, MonthlyFixedExpense, Driver, Vehicle, PaymentMethod } from '@/types';
import { Loader2, Wrench, DollarSign, AlertTriangle, Receipt, Truck, RefreshCw } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { serviceService, inventoryService, personnelService, rentalService, dashboardService } from '@/lib/services';
import { parseDate } from '@/lib/forms';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { isValid, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { toZonedTime } from 'date-fns-tz';
import { GlobalTransactionDialog, GlobalTransactionFormValues } from '../flotillav2/components/GlobalTransactionDialog';
import { DashboardCharts } from './components/DashboardCharts';

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
  
  const [activeServices, setActiveServices] = useState<ServiceRecord[]>([]);
  const [completedServicesToday, setCompletedServicesToday] = useState<ServiceRecord[]>([]);
  const [salesToday, setSalesToday] = useState<SaleReceipt[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [dashboardStats, setDashboardStats] = useState<{ financialData: any[], operationalData: any }>({ financialData: [], operationalData: { lineData: [], pieData: [] } });

  const [isLoading, setIsLoading] = useState(true);

  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  
  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      serviceService.onActiveServicesUpdate(setActiveServices),
      dashboardService.onServicesCompletedTodayUpdate(setCompletedServicesToday),
      dashboardService.onSalesTodayUpdate(setSalesToday),
      dashboardService.onDashboardStatsUpdate(setDashboardStats),
      inventoryService.onItemsUpdate(setAllInventory),
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

    const revenueFromSales = salesToday.reduce((sum, s) => sum + (Number(s.totalAmount) || 0), 0);

    const revenueFromServices = completedServicesToday.reduce((sum, s) => {
      const tc = Number(s.totalCost);
      const value =
        Number.isFinite(tc) && tc > 0 ? tc : sumPaymentsBetween(s, dayStart, dayEnd);
      return sum + value;
    }, 0);

    const profitFromSales = salesToday.reduce(
      (sum, s) => sum + calculateSaleProfit(s, allInventory),
      0
    );

    const profitFromServices = completedServicesToday.reduce(
      (sum, s) => sum + calcEffectiveProfit(s, allInventory),
      0
    );

    const repairingServices = activeServices.filter((s) => s.status === "En Taller");
    const scheduledTodayServices = activeServices.filter((s) => {
      if (s.status !== "Agendado") return false;
      const d = parseDate(s.serviceDate || new Date().toDateString());
      if (!d || !isValid(d)) return false;
      const dz = toZonedTime(d, TZ);
      return isWithinInterval(dz, { start: dayStart, end: dayEnd });
    });

    return {
      dailyRevenue: revenueFromSales + revenueFromServices,
      dailyProfit: profitFromSales + profitFromServices,
      activeServices: repairingServices.length + scheduledTodayServices.length + completedServicesToday.length,
      lowStockAlerts: allInventory.filter((i) => !i.isService && (i.quantity || 0) <= (i.lowStockThreshold || 0)).length,
    };
  }, [activeServices, completedServicesToday, salesToday, allInventory]);

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

  return (
    <>
      <div className="container mx-auto py-8 flex flex-col">
        <PageHeader
          title={userName ? `¡Bienvenido, ${userName}!` : 'Panel Principal de Taller'}
          description="Vista del estado actual de los servicios y herramientas de gestión."
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
              <Button 
                variant="outline" 
                className="w-full sm:w-auto bg-white border-purple-500 text-black font-bold hover:bg-purple-50" 
                onClick={async () => {
                   try {
                     setIsLoading(true);
                     toast({ title: "Generando Estadísticas...", description: "Por favor espera unos segundos." });
                     await dashboardService.forceGenerateDashboardStats();
                     toast({ title: "¡Éxito!", description: "Las estadísticas han sido calculadas." });
                   } catch (e: any) {
                     console.error("Error al generar estadísticas:", e);
                     toast({ title: "Error", description: e.message || "Fallo en el servidor", variant: "destructive" });
                   } finally {
                     setIsLoading(false);
                   }
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4 text-purple-600" />
                Actualizar Gráficas
              </Button>
            </div>
          }
        />

         <div className="mb-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
              <CardTitle className="text-sm font-medium">Alertas de Stock Bajo</CardTitle>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-1/4" /> : <div className="text-2xl font-bold font-headline">{kpiData.lowStockAlerts}</div>}
              {isLoading ? <Skeleton className="h-4 w-2/3 mt-1" /> : <p className="text-xs text-muted-foreground">Ítems que necesitan reposición</p>}
            </CardContent>
          </Card>
        </div>
        
        {isLoading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="mr-2 h-8 w-8 animate-spin" />
            Cargando reportes...
          </div>
        ) : (
          <DashboardCharts
            financialData={dashboardStats?.financialData || []}
            operationalData={dashboardStats?.operationalData || { lineData: [], pieData: [] }}
          />
        )}

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
