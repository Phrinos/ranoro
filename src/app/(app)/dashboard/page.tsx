// src/app/(app)/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { calculateSaleProfit, calcEffectiveProfit } from '@/lib/money-helpers';
import type { User, ServiceRecord, SaleReceipt, InventoryItem, Driver, Vehicle, PaymentMethod } from '@/types';
import { Loader2, Wrench, DollarSign, AlertTriangle, Receipt, Truck, RefreshCw, TrendingUp, Activity, PackageOpen } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { serviceService, inventoryService, personnelService, rentalService, dashboardService } from '@/lib/services';
import { parseDate } from '@/lib/forms';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/constants/app';
import { isValid, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { formatCurrency, cn } from '@/lib/utils';
import Link from 'next/link';
import { toZonedTime } from 'date-fns-tz';
import { PaymentDialog, type PaymentFormValues } from '../flotilla/components/dialogs/payment-dialog';
import { DashboardCharts } from './components/DashboardCharts';

const TZ = "America/Mexico_City";

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
  const [isRefreshing, setIsRefreshing] = useState(false);
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
      const value = Number.isFinite(tc) && tc > 0 ? tc : sumPaymentsBetween(s, dayStart, dayEnd);
      return sum + value;
    }, 0);

    const profitFromSales = salesToday.reduce((sum, s) => sum + calculateSaleProfit(s, allInventory), 0);
    const profitFromServices = completedServicesToday.reduce((sum, s) => sum + calcEffectiveProfit(s, allInventory), 0);

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

  const handleSaveTransaction = async (values: PaymentFormValues) => {
    try {
        const driver = drivers.find(d => d.id === values.driverId);
        if (!driver) throw new Error("Driver not found.");
        const vehicle = vehicles.find(v => v.id === driver.assignedVehicleId);
        if (!vehicle) throw new Error("Vehicle not found for payment.");
        await rentalService.addRentalPayment(driver, vehicle, values.amount, values.note, values.paymentDate, values.paymentMethod as PaymentMethod);
        toast({ title: "Pago Registrado" });
        setIsTransactionDialogOpen(false);
    } catch (error) {
        toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleGenerateStats = async () => {
    try {
      setIsRefreshing(true);
      toast({ title: "Generando Estadísticas...", description: "Por favor espera unos segundos." });
      await dashboardService.forceGenerateDashboardStats();
      toast({ title: "¡Éxito!", description: "Las estadísticas han sido calculadas." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Fallo en el servidor", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <div className="container mx-auto py-6 sm:py-8 flex flex-col space-y-8 animate-in fade-in duration-500">
        
        {/* HERO SECTION */}
        <div className="relative overflow-hidden rounded-4xl bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-8 sm:p-10 text-white shadow-xl">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3">
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl bg-clip-text text-transparent bg-linear-to-r from-white to-white/70">
                {userName ? `¡Hola, ${userName.split(' ')[0]}!` : 'Panel Principal'}
              </h1>
              <p className="text-slate-300 max-w-lg text-sm sm:text-base leading-relaxed">
                Visualiza el estado operativo actual y administra rápidamente los flujos de servicio de la sucursal.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-slate-100 font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                <Link href="/servicios/nuevo">
                  <Wrench className="mr-2 h-4 w-4 text-primary" />
                  Nuevo Servicio
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-white/10 text-white hover:bg-white/20 font-semibold backdrop-blur-md border border-white/10 transition-all hover:-translate-y-0.5">
                <Link href="/punto-de-venta/nueva-venta">
                  <Receipt className="mr-2 h-4 w-4" />
                  Punto de Venta
                </Link>
              </Button>
              <Button size="lg" onClick={() => setIsTransactionDialogOpen(true)} className="bg-white/10 text-white hover:bg-white/20 font-semibold backdrop-blur-md border border-white/10 transition-all hover:-translate-y-0.5">
                <Truck className="mr-2 h-4 w-4" />
                Pago Flotilla
              </Button>
              <Button size="lg" onClick={handleGenerateStats} disabled={isRefreshing} className="bg-white/10 text-white hover:bg-white/20 font-semibold backdrop-blur-md border border-white/10 transition-all hover:-translate-y-0.5">
                <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
                Actualizar
              </Button>
            </div>
          </div>
          
          {/* Decorative blur rings */}
          <div className="absolute right-0 top-0 w-96 h-96 -translate-y-1/2 translate-x-1/3 bg-primary/30 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute left-0 bottom-0 w-64 h-64 translate-y-1/3 -translate-x-1/4 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />
        </div>

        {/* KPI CARDS */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          
          {/* Card 1: Ingresos */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow border-0 shadow-md ring-1 ring-border/50">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="w-24 h-24 text-emerald-500 -mt-6 -mr-6" />
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-muted-foreground">Ingresos del Día</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-32 mt-1" />
                  ) : (
                    <h3 className="text-2xl font-black text-emerald-950 tracking-tight">{formatCurrency(kpiData.dailyRevenue)}</h3>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Utilidad estimada</span>
                {isLoading ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  <span className="text-sm font-bold text-emerald-700">{formatCurrency(kpiData.dailyProfit)}</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Servicios */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow border-0 shadow-md ring-1 ring-border/50">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="w-24 h-24 text-blue-500 -mt-6 -mr-6" />
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <Wrench className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-muted-foreground">Servicios Activos</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <h3 className="text-2xl font-black text-blue-950 tracking-tight">{kpiData.activeServices}</h3>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Agendados y en taller</span>
                <Link href="/servicios" className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                  Ver panel &rarr;
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Stock */}
          <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow border-0 shadow-md ring-1 ring-border/50">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <PackageOpen className="w-24 h-24 text-amber-500 -mt-6 -mr-6" />
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-muted-foreground">Alertas de Stock</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <h3 className="text-2xl font-black text-amber-950 tracking-tight">{kpiData.lowStockAlerts}</h3>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Ítems p/ reabastecer</span>
                <Link href="/inventario?tab=reportes" className="text-xs font-semibold text-amber-600 hover:text-amber-800 transition-colors">
                  Surtir &rarr;
                </Link>
              </div>
            </CardContent>
          </Card>

        </div>
        
        {/* CHARTS CONTAINER */}
        <div className="rounded-2xl border bg-card text-card-foreground shadow-xs">
          {isLoading ? (
            <div className="flex h-[400px] w-full flex-col items-center justify-center space-y-4 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
              <p className="text-sm font-medium tracking-wide">Cargando visualizaciones...</p>
            </div>
          ) : (
            <DashboardCharts
              financialData={dashboardStats?.financialData || []}
              operationalData={dashboardStats?.operationalData || { lineData: [], pieData: [] }}
            />
          )}
        </div>

      </div>

      <PaymentDialog
        open={isTransactionDialogOpen}
        onOpenChange={setIsTransactionDialogOpen}
        onSave={handleSaveTransaction}
        drivers={drivers.filter(d => !d.isArchived)}
      />
    </>
  );
}
