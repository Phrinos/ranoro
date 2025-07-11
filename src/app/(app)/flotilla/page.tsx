

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, ListFilter, ShieldCheck, User, ChevronRight, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddVehicleToFleetDialog } from "./components/add-vehicle-to-fleet-dialog";
import { FineCheckDialog } from "./components/fine-check-dialog";
import { placeholderVehicles, persistToFirestore, hydrateReady, AUTH_USER_LOCALSTORAGE_KEY, placeholderDrivers, placeholderRentalPayments } from '@/lib/placeholder-data';
import type { User, Vehicle, Driver } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { subDays, isBefore, parseISO, isValid, differenceInCalendarDays, startOfToday, isAfter, compareAsc, startOfMonth, endOfMonth, getDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, cn } from '@/lib/utils';
import { DriverDialog } from '../conductores/components/driver-dialog';
import type { DriverFormValues } from '../conductores/components/driver-form';
import Link from 'next/link';

type FlotillaSortOption = "plate_asc" | "plate_desc" | "owner_asc" | "owner_desc" | "rent_asc" | "rent_desc";
type DriverSortOption = 'name_asc' | 'name_desc';

const FINE_CHECK_INTERVAL_DAYS = 15;
const FINE_CHECK_STORAGE_KEY = 'fleetFineLastCheckDate';

interface MonthlyBalance {
  driverId: string;
  driverName: string;
  vehicleInfo: string;
  charges: number;
  payments: number;
  balance: number;
  daysOwed: number;
}

function FlotillaPageComponent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'informe';

  const [version, setVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [isAddVehicleDialogOpen, setIsAddVehicleDialogOpen] = useState(false);
  const [isFineCheckDialogOpen, setIsFineCheckDialogOpen] = useState(false);
  
  // States for 'vehiculos' tab
  const [searchTermVehicles, setSearchTermVehicles] = useState("");
  const [sortOptionVehicles, setSortOptionVehicles] = useState<FlotillaSortOption>("plate_asc");

  // States for 'conductores' tab
  const [searchTermDrivers, setSearchTermDrivers] = useState('');
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [sortOptionDrivers, setSortOptionDrivers] = useState<DriverSortOption>('name_asc');

  const [lastFineCheckDate, setLastFineCheckDate] = useState<Date | null>(null);

  useEffect(() => {
    hydrateReady.then(() => setHydrated(true));
    const savedDateStr = localStorage.getItem(FINE_CHECK_STORAGE_KEY);
    if (savedDateStr) {
      const savedDate = new Date(savedDateStr);
      if (!isNaN(savedDate.getTime())) setLastFineCheckDate(savedDate);
    }
    const forceUpdate = () => setVersion(v => v + 1);
    window.addEventListener('databaseUpdated', forceUpdate);
    return () => window.removeEventListener('databaseUpdated', forceUpdate);
  }, []);

  const allVehicles = useMemo(() => hydrated ? [...placeholderVehicles] : [], [hydrated, version]);
  const allDrivers = useMemo(() => hydrated ? [...placeholderDrivers] : [], [hydrated, version]);

  const fleetVehicles = useMemo(() => allVehicles.filter(v => v.isFleetVehicle), [allVehicles]);
  const nonFleetVehicles = useMemo(() => allVehicles.filter(v => !v.isFleetVehicle), [allVehicles]);

  const monthlyBalances = useMemo((): MonthlyBalance[] => {
    if (!hydrated) return [];
    
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const paymentsThisMonthByDriver = placeholderRentalPayments.filter(p => {
        const pDate = parseISO(p.paymentDate);
        return isValid(pDate) && isWithinInterval(pDate, { start: monthStart, end: monthEnd });
    }).reduce((acc, p) => {
        acc[p.driverId] = (acc[p.driverId] || 0) + p.amount;
        return acc;
    }, {} as Record<string, number>);

    return allDrivers.map(driver => {
        const vehicle = allVehicles.find(v => v.id === driver.assignedVehicleId);
        const dailyRate = vehicle?.dailyRentalCost || 0;
        
        let charges = 0;
        if (driver.contractDate && dailyRate > 0) {
            const contractStartDate = parseISO(driver.contractDate);
            if (isValid(contractStartDate) && !isAfter(contractStartDate, today)) {
                const startOfCalculation = isAfter(contractStartDate, monthStart) ? contractStartDate : monthStart;
                const daysInMonthSoFar = differenceInCalendarDays(today, startOfCalculation) + 1;
                charges = daysInMonthSoFar * dailyRate;
            }
        }
        
        const manualDebtsThisMonth = (driver.manualDebts || []).filter(d => {
            const dDate = parseISO(d.date);
            return isValid(dDate) && isWithinInterval(dDate, { start: monthStart, end: monthEnd });
        }).reduce((sum, d) => sum + d.amount, 0);

        const totalCharges = charges + manualDebtsThisMonth;
        const totalPayments = paymentsThisMonthByDriver[driver.id] || 0;
        const balance = totalPayments - totalCharges;
        const debt = Math.max(0, -balance);
        const daysOwed = dailyRate > 0 ? debt / dailyRate : 0;
        
        return {
            driverId: driver.id,
            driverName: driver.name,
            vehicleInfo: vehicle ? `${vehicle.licensePlate} (${formatCurrency(dailyRate)}/día)` : 'N/A',
            charges: totalCharges,
            payments: totalPayments,
            balance: balance,
            daysOwed: daysOwed,
        };
    }).sort((a,b) => a.driverName.localeCompare(b.driverName));
  }, [hydrated, version, allDrivers, allVehicles]);
  
  const overduePaperwork = useMemo(() => {
    if (!hydrated) return [];
    const today = startOfToday();
    const alerts: { vehicleId: string; vehicleLicensePlate: string; paperworkId: string; paperworkName: string; dueDate: string; }[] = [];
    fleetVehicles.forEach(vehicle => {
        (vehicle.paperwork || []).forEach(p => {
            const dueDate = parseISO(p.dueDate);
            if (p.status === 'Pendiente' && isValid(dueDate) && !isAfter(dueDate, today)) {
                alerts.push({ vehicleId: vehicle.id, vehicleLicensePlate: vehicle.licensePlate, paperworkId: p.id, paperworkName: p.name, dueDate: p.dueDate });
            }
        });
    });
    return alerts.sort((a,b) => compareAsc(parseISO(a.dueDate), parseISO(b.dueDate)));
  }, [hydrated, version, fleetVehicles]);

  const filteredFleetVehicles = useMemo(() => {
    let vehicles = [...fleetVehicles];
    if (searchTermVehicles) vehicles = vehicles.filter(v => v.licensePlate.toLowerCase().includes(searchTermVehicles.toLowerCase()) || v.make.toLowerCase().includes(searchTermVehicles.toLowerCase()) || v.model.toLowerCase().includes(searchTermVehicles.toLowerCase()) || v.ownerName.toLowerCase().includes(searchTermVehicles.toLowerCase()));
    vehicles.sort((a, b) => (sortOptionVehicles === 'plate_desc' ? b.licensePlate.localeCompare(a.licensePlate) : a.licensePlate.localeCompare(b.licensePlate)));
    return vehicles;
  }, [fleetVehicles, searchTermVehicles, sortOptionVehicles]);
  
  const filteredDrivers = useMemo(() => {
    let itemsToDisplay = [...allDrivers];
    if (searchTermDrivers.trim()) {
        const lowerSearch = searchTermDrivers.toLowerCase();
        itemsToDisplay = itemsToDisplay.filter(driver => driver.name.toLowerCase().includes(lowerSearch) || driver.phone.toLowerCase().includes(lowerSearch));
    }
    itemsToDisplay.sort((a, b) => (sortOptionDrivers === 'name_desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)));
    return itemsToDisplay;
  }, [allDrivers, searchTermDrivers, sortOptionDrivers]);

  const uniqueOwners = useMemo(() => Array.from(new Set(fleetVehicles.map(v => v.ownerName))).sort(), [fleetVehicles]);

  const handleAddVehicleToFleet = async (vehicleId: string, costs: { dailyRentalCost: number; gpsMonthlyCost: number; adminMonthlyCost: number; insuranceMonthlyCost: number; }) => {
    const vehicleIndex = placeholderVehicles.findIndex(v => v.id === vehicleId);
    if (vehicleIndex === -1) return toast({ title: "Error", description: "Vehículo no encontrado.", variant: "destructive" });
    placeholderVehicles[vehicleIndex] = { ...placeholderVehicles[vehicleIndex], isFleetVehicle: true, ...costs };
    await persistToFirestore(['vehicles']);
    toast({ title: "Vehículo Añadido", description: `${placeholderVehicles[vehicleIndex].licensePlate} ha sido añadido a la flotilla.` });
    setIsAddVehicleDialogOpen(false);
  };

  const handleConfirmFineCheck = useCallback(async (checkedVehicleIds: string[]) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (!authUserString) return toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
    const currentUser: User = JSON.parse(authUserString);
    const now = new Date();
    checkedVehicleIds.forEach(id => {
      const vehicleIndex = placeholderVehicles.findIndex(v => v.id === id);
      if (vehicleIndex > -1) {
        const vehicle = placeholderVehicles[vehicleIndex];
        if (!vehicle.fineCheckHistory) vehicle.fineCheckHistory = [];
        vehicle.fineCheckHistory.push({ date: now.toISOString(), checkedBy: currentUser.name, checkedById: currentUser.id });
      }
    });
    localStorage.setItem(FINE_CHECK_STORAGE_KEY, now.toISOString());
    setLastFineCheckDate(now);
    await persistToFirestore(['vehicles']);
    setIsFineCheckDialogOpen(false);
    toast({ title: "Revisión Confirmada", description: "Se ha guardado el historial de revisión de multas." });
  }, [toast]);
  
  const handleOpenDriverDialog = useCallback((driver: Driver | null = null) => { setEditingDriver(driver); setIsDriverDialogOpen(true); }, []);
  const handleSaveDriver = useCallback(async (formData: DriverFormValues) => {
    const isEditing = !!editingDriver;
    const driverId = editingDriver ? editingDriver.id : `DRV_${Date.now().toString(36)}`;
    const newDriverData: Driver = { id: driverId, ...editingDriver, ...formData, documents: editingDriver?.documents || {} };
    if (isEditing) {
        const dIndex = placeholderDrivers.findIndex(d => d.id === driverId);
        if (dIndex > -1) placeholderDrivers[dIndex] = newDriverData;
    } else {
        placeholderDrivers.push(newDriverData);
    }
    await persistToFirestore(['drivers']);
    toast({ title: `Conductor ${isEditing ? 'Actualizado' : 'Creado'}`, description: `Se han guardado los datos para ${formData.name}.` });
    setIsDriverDialogOpen(false);
  }, [editingDriver, toast]);

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Flotilla</h1>
        <p className="text-primary-foreground/80 mt-1">Administra vehículos, conductores, pagos y reportes de tu flotilla.</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
          <TabsTrigger value="informe" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Informe</TabsTrigger>
          <TabsTrigger value="reportes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Reportes</TabsTrigger>
          <TabsTrigger value="conductores" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Conductores</TabsTrigger>
          <TabsTrigger value="vehiculos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Vehículos</TabsTrigger>
        </TabsList>
        <TabsContent value="informe" className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Estado de Cuenta Mensual</CardTitle>
                            <CardDescription>Resumen de saldos de todos los conductores para el mes de {format(new Date(), "MMMM", { locale: es })}.</CardDescription>
                        </div>
                        <p className="text-sm text-muted-foreground">Día {getDate(new Date())} del mes</p>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-black">
                                <TableRow>
                                    <TableHead className="text-white">Conductor</TableHead>
                                    <TableHead className="text-white">Vehículo (Renta)</TableHead>
                                    <TableHead className="text-right text-white">Ingresos del Mes</TableHead>
                                    <TableHead className="text-right text-white">Cargos del Mes</TableHead>
                                    <TableHead className="text-right text-white">Balance Mensual</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {monthlyBalances.length > 0 ? (
                                    monthlyBalances.map(mb => (
                                        <TableRow key={mb.driverId} className={cn(mb.daysOwed > 2 && "bg-red-50 dark:bg-red-900/30")}>
                                            <TableCell className="font-semibold">{mb.driverName}</TableCell>
                                            <TableCell>{mb.vehicleInfo}</TableCell>
                                            <TableCell className="text-right text-green-600">{formatCurrency(mb.payments)}</TableCell>
                                            <TableCell className="text-right text-red-600">{formatCurrency(mb.charges)}</TableCell>
                                            <TableCell className={cn("text-right font-bold", mb.balance >= 0 ? "text-green-700" : "text-red-700")}>{formatCurrency(mb.balance)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay conductores activos.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            <Card className="border-orange-500/50 bg-orange-50 dark:bg-orange-900/30">
                <CardHeader><CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300"><AlertTriangle />Trámites Vencidos o por Vencer</CardTitle></CardHeader>
                <CardContent>
                    {overduePaperwork.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                            {overduePaperwork.map(item => (
                                <Link href={`/flotilla/${item.vehicleId}`} key={item.paperworkId} className="flex justify-between items-center p-2 rounded-md hover:bg-orange-100 dark:hover:bg-orange-800/50">
                                    <div><p className="font-semibold">{item.vehicleLicensePlate}: {item.paperworkName}</p></div>
                                    <div className="text-right"><p className="font-bold text-destructive text-sm">Vence:</p><p className="text-xs text-muted-foreground">{format(parseISO(item.dueDate), "dd MMM yyyy", { locale: es })}</p></div>
                                </Link>
                            ))}
                        </div>
                    ) : <p className="text-muted-foreground text-center py-4">No hay trámites vencidos.</p>}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="reportes" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div><h2 className="text-2xl font-semibold tracking-tight">Reporte de Ingresos de Flotilla</h2><p className="text-muted-foreground">Seleccione un propietario para ver el detalle de ingresos de sus vehículos.</p></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{uniqueOwners.map(owner => (<Link key={owner} href={`/flotilla/reporte-ingresos/${encodeURIComponent(owner)}`} passHref><Card className="hover:bg-muted hover:border-primary/50 transition-all shadow-sm"><CardContent className="p-4 flex items-center justify-between"><div className="flex items-center gap-3"><User className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">{owner}</span></div><ChevronRight className="h-5 w-5 text-muted-foreground" /></CardContent></Card></Link>))}</div>
        </TabsContent>
        <TabsContent value="conductores" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div><h2 className="text-2xl font-semibold tracking-tight">Conductores</h2><p className="text-muted-foreground">Gestiona la información de los conductores.</p></div>
              <Button onClick={() => handleOpenDriverDialog()}><PlusCircle className="mr-2 h-4 w-4" />Nuevo Conductor</Button>
          </div>
          <Card><CardHeader><Input type="search" placeholder="Buscar por nombre o teléfono..." className="w-full sm:w-1/2 lg:w-1/3" value={searchTermDrivers} onChange={e => setSearchTermDrivers(e.target.value)} /></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Teléfono</TableHead><TableHead>Vehículo Asignado</TableHead><TableHead className="text-right">Depósito</TableHead></TableRow></TableHeader><TableBody>{filteredDrivers.length > 0 ? filteredDrivers.map(driver => (<TableRow key={driver.id} className="cursor-pointer" onClick={() => router.push(`/conductores/${driver.id}`)}><TableCell className="font-semibold">{driver.name}</TableCell><TableCell>{driver.phone}</TableCell><TableCell>{allVehicles.find(v => v.id === driver.assignedVehicleId)?.licensePlate || 'N/A'}</TableCell><TableCell className="text-right">{driver.depositAmount ? formatCurrency(driver.depositAmount) : 'N/A'}</TableCell></TableRow>)) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No se encontraron conductores.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
        </TabsContent>
        <TabsContent value="vehiculos" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div><h2 className="text-2xl font-semibold tracking-tight">Vehículos de la Flotilla</h2><p className="text-muted-foreground">Gestiona los vehículos que forman parte de tu flotilla.</p></div>
              <div className="flex flex-col sm:flex-row gap-2"><Button variant="secondary" onClick={() => setIsFineCheckDialogOpen(true)}><ShieldCheck className="mr-2 h-4 w-4" />Revisar Multas</Button><Button onClick={() => setIsAddVehicleDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Añadir Vehículo</Button></div>
          </div>
          <Card><CardHeader><Input type="search" placeholder="Buscar por placa, marca, modelo o propietario..." className="w-full sm:w-1/2 lg:w-1/3" value={searchTermVehicles} onChange={e => setSearchTermVehicles(e.target.value)} /></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Placa</TableHead><TableHead>Vehículo</TableHead><TableHead>Color</TableHead><TableHead>Propietario</TableHead><TableHead className="text-right">Renta Diaria</TableHead></TableRow></TableHeader><TableBody>{filteredFleetVehicles.length > 0 ? filteredFleetVehicles.map(v => (<TableRow key={v.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/flotilla/${v.id}`)}><TableCell className="font-medium">{v.licensePlate}</TableCell><TableCell>{v.make} {v.model} {v.year}</TableCell><TableCell>{v.color || 'N/A'}</TableCell><TableCell>{v.ownerName}</TableCell><TableCell className="text-right font-semibold">${(v.dailyRentalCost || 0).toFixed(2)}</TableCell></TableRow>)) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay vehículos en la flotilla.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
        </TabsContent>
      </Tabs>
      <AddVehicleToFleetDialog open={isAddVehicleDialogOpen} onOpenChange={setIsAddVehicleDialogOpen} vehicles={nonFleetVehicles} onAddVehicle={handleAddVehicleToFleet} />
      <FineCheckDialog open={isFineCheckDialogOpen} onOpenChange={setIsFineCheckDialogOpen} fleetVehicles={fleetVehicles} onConfirm={handleConfirmFineCheck} />
      <DriverDialog open={isDriverDialogOpen} onOpenChange={setIsDriverDialogOpen} driver={editingDriver} onSave={handleSaveDriver} />
    </>
  );
}

export default function FlotillaPageWrapper() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <FlotillaPageComponent />
        </Suspense>
    )
}

