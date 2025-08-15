

"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { calculateSaleProfit } from '@/lib/placeholder-data';
import type { User, CapacityAnalysisOutput, ServiceRecord, SaleReceipt, InventoryItem, Personnel } from '@/types';
import { BrainCircuit, Loader2, Wrench, DollarSign, AlertTriangle, Receipt, Landmark } from 'lucide-react'; 
import { useToast } from '@/hooks/use-toast';
import { analyzeWorkshopCapacity } from '@/ai/flows/capacity-analysis-flow';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { serviceService, saleService, inventoryService, personnelService } from '@/lib/services';
import { parseDate } from '@/lib/forms';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { isValid, isToday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { DashboardCharts } from './components/DashboardCharts';

export default function DashboardPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const { toast } = useToast();
  
  // States for real-time data
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [capacityInfo, setCapacityInfo] = useState<CapacityAnalysisOutput | null>(null);
  const [isCapacityLoading, setIsCapacityLoading] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);
  
  // Real-time data subscriptions
  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
      serviceService.onServicesUpdate(setAllServices),
      saleService.onSalesUpdate(setAllSales),
      inventoryService.onItemsUpdate(setAllInventory),
      personnelService.onPersonnelUpdate((personnel) => {
        setAllPersonnel(personnel);
        setIsLoading(false);
      }),
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const kpiData = useMemo(() => {
    const clientToday = new Date();
    
    const repairingServices = allServices.filter(s => s.status === 'En Taller');
    const scheduledTodayServices = allServices.filter(s => {
      if (s.status !== 'Agendado') return false;
      const serviceDay = parseDate(s.serviceDate);
      return serviceDay && isValid(serviceDay) && isToday(serviceDay);
    });

    const salesToday = allSales.filter(s => {
        const saleDay = parseDate(s.saleDate);
        return saleDay && isValid(saleDay) && isSameDay(saleDay, clientToday) && s.status !== 'Cancelado';
    });
    
    const servicesCompletedToday = allServices.filter(s => {
      if (s.status !== 'Entregado') return false;
      const deliveryDay = parseDate(s.deliveryDateTime);
      return deliveryDay && isValid(deliveryDay) && isSameDay(deliveryDay, clientToday);
    });
    
    const revenueFromSales = salesToday.reduce((sum, s) => sum + s.totalAmount, 0);
    const revenueFromServices = servicesCompletedToday.reduce((sum, s) => sum + (s.totalCost || 0), 0);
    
    const profitFromSales = salesToday.reduce((sum, s) => sum + calculateSaleProfit(s, allInventory), 0);
    const profitFromServices = servicesCompletedToday.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);

    return {
        dailyRevenue: revenueFromSales + revenueFromServices,
        dailyProfit: profitFromSales + profitFromServices,
        activeServices: repairingServices.length + scheduledTodayServices.length + servicesCompletedToday.length,
        lowStockAlerts: allInventory.filter(item => !item.isService && item.quantity <= item.lowStockThreshold).length
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
      toast({ title: "Análisis de Capacidad Completo", description: result.recommendation });
    } catch (e: any) {
      setCapacityError(e.message || 'Error en análisis de capacidad');
    } finally {
      setIsCapacityLoading(false);
    }
  }, [allServices, allPersonnel, toast]);

  return (
    <div className="container mx-auto py-8 flex flex-col">
      <PageHeader
        title={userName ? `¡Bienvenido, ${userName}!` : 'Panel Principal de Taller'}
        description="Vista del estado actual de los servicios y herramientas de IA."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/servicios/nuevo">
                <Wrench className="mr-2 h-4 w-4" />
                Nuevo Servicio
              </Link>
            </Button>
             <Button asChild variant="outline" className="bg-white hover:bg-gray-100 text-black">
              <Link href="/pos/nuevo">
                <Receipt className="mr-2 h-4 w-4" />
                Punto de Venta
              </Link>
            </Button>
            <Button asChild variant="outline" className="bg-white hover:bg-gray-100 text-black">
              <Link href="/rentas?action=registrar">
                <Landmark className="mr-2 h-4 w-4" />
                Registrar Pago Flotilla
              </Link>
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
              {capacityInfo ? (
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
                  <Button size="sm" className="w-full mt-2" onClick={runCapacityAnalysis} disabled={isCapacityLoading}>
                      {isCapacityLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                      {isCapacityLoading ? 'Analizando...' : 'Analizar Capacidad con IA'}
                  </Button>
              )}
          </CardContent>
        </Card>
      </div>

      <DashboardCharts services={allServices} sales={allSales} />

    </div>
  );
}
