

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, ListFilter, ShieldCheck, User, ChevronRight, AlertTriangle, UserCheck, UserX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddVehicleToFleetDialog } from "./add-vehicle-to-fleet-dialog";
import { FineCheckDialog } from "./fine-check-dialog";
import type { User, Vehicle, Driver, RentalPayment } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { subDays, isBefore, parseISO, isValid, differenceInCalendarDays, startOfToday, isAfter, compareAsc, startOfMonth, endOfMonth, getDate, isWithinInterval, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, cn, calculateDriverDebt } from "@/lib/utils";
import { DriverDialog } from '../../conductores/components/driver-dialog';
import type { DriverFormValues } from '../../conductores/components/driver-form';
import Link from 'next/link';
import { inventoryService, personnelService, operationsService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';

const FINE_CHECK_STORAGE_KEY = 'lastFineCheckDate';

type FlotillaSortOption = "plate_asc" | "plate_desc" | "owner_asc" | "owner_desc" | "rent_asc" | "rent_desc";
type DriverSortOption = 'name_asc' | 'name_desc';

export function FlotillaPageComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { toast } = useToast();
  const router = useRouter();
  const defaultTab = (searchParams?.tab as string) || 'conductores';

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [isAddVehicleDialogOpen, setIsAddVehicleDialogOpen] = useState(false);
  const [isFineCheckDialogOpen, setIsFineCheckDialogOpen] = useState(false);
  
  // States for 'vehiculos' tab
  const [searchTermVehicles, setSearchTermVehicles] = useState("");
  const [sortOptionVehicles, setSortOptionVehicles] = useState<FlotillaSortOption>("plate_asc");

  // States for 'conductores' tab
  const [searchTermDrivers, setSearchTermDrivers] = useState('');
  const [sortOptionDrivers, setSortOptionDrivers] = useState<DriverSortOption>('name_asc');
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [showArchivedDrivers, setShowArchivedDrivers] = useState(false);

  const [lastFineCheckDate, setLastFineCheckDate] = useState<Date | null>(null);

  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    setIsLoading(true);
    const unsubs = [
        inventoryService.onVehiclesUpdate(setAllVehicles),
        personnelService.onDriversUpdate((data) => {
            setAllDrivers(data);
            setIsLoading(false);
        }),
    ];
    
    const savedDateStr = localStorage.getItem(FINE_CHECK_STORAGE_KEY);
    if (savedDateStr) {
      const savedDate = new Date(savedDateStr);
      if (!isNaN(savedDate.getTime())) setLastFineCheckDate(savedDate);
    }
    
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const fleetVehicles = useMemo(() => allVehicles.filter(v => v.isFleetVehicle), [allVehicles]);
  const nonFleetVehicles = useMemo(() => allVehicles.filter(v => !v.isFleetVehicle), [allVehicles]);
  
  const filteredFleetVehicles = useMemo(() => {
    let vehicles = [...fleetVehicles];
    if (searchTermVehicles) {
      const lowerSearch = searchTermVehicles.toLowerCase();
      vehicles = vehicles.filter(v => 
        v.licensePlate.toLowerCase().includes(lowerSearch) || 
        v.make.toLowerCase().includes(lowerSearch) || 
        v.model.toLowerCase().includes(lowerSearch) || 
        v.ownerName.toLowerCase().includes(lowerSearch)
      );
    }
    vehicles.sort((a, b) => {
      switch (sortOptionVehicles) {
        case 'plate_desc': return b.licensePlate.localeCompare(a.licensePlate);
        case 'plate_asc':
        default:
          return a.licensePlate.localeCompare(b.licensePlate);
      }
    });
    return vehicles;
  }, [fleetVehicles, searchTermVehicles, sortOptionVehicles]);
  
  const filteredDrivers = useMemo(() => {
    let itemsToDisplay = allDrivers.filter(driver => showArchivedDrivers ? !!driver.isArchived : !driver.isArchived);
    if (searchTermDrivers.trim()) {
        const lowerSearch = searchTermDrivers.toLowerCase();
        itemsToDisplay = itemsToDisplay.filter(driver => driver.name.toLowerCase().includes(lowerSearch) || driver.phone.toLowerCase().includes(lowerSearch));
    }
    itemsToDisplay.sort((a, b) => (sortOptionDrivers === 'name_desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)));
    return itemsToDisplay;
  }, [allDrivers, searchTermDrivers, sortOptionDrivers, showArchivedDrivers]);

  const handleAddVehicleToFleet = async (vehicleId: string, costs: { dailyRentalCost: number; gpsMonthlyCost: number; adminMonthlyCost: number; insuranceMonthlyCost: number; }) => {
    const vehicle = allVehicles.find(v => v.id === vehicleId);
    if (!vehicle) return toast({ title: "Error", description: "Vehículo no encontrado.", variant: "destructive" });

    const updatedVehicleData = { 
        ...vehicle, 
        isFleetVehicle: true, 
        dailyRentalCost: costs.dailyRentalCost,
        gpsMonthlyCost: costs.gpsMonthlyCost,
        adminMonthlyCost: costs.adminMonthlyCost,
        insuranceMonthlyCost: costs.insuranceMonthlyCost,
    };
    
    await inventoryService.saveVehicle(updatedVehicleData, vehicleId);
    toast({ title: "Vehículo Añadido", description: `${vehicle.licensePlate} ha sido añadido a la flotilla.` });
    setIsAddVehicleDialogOpen(false);
  };

  const handleConfirmFineCheck = useCallback(async (checkedVehicleIds: string[]) => {
    const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
    if (!authUserString) return toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
    const currentUser: User = JSON.parse(authUserString);
    const now = new Date();
    
    const updates = checkedVehicleIds.map(id => {
        const vehicle = allVehicles.find(v => v.id === id);
        if (!vehicle) return null;
        
        const newHistoryEntry = { date: now.toISOString(), checkedBy: currentUser.name, checkedById: currentUser.id };
        const updatedHistory = [...(vehicle.fineCheckHistory || []), newHistoryEntry];
        
        return inventoryService.saveVehicle({ ...vehicle, fineCheckHistory: updatedHistory }, id);
    });

    await Promise.all(updates.filter(Boolean));
    
    localStorage.setItem(FINE_CHECK_STORAGE_KEY, now.toISOString());
    setLastFineCheckDate(now);
    setIsFineCheckDialogOpen(false);
    toast({ title: "Revisión Confirmada", description: "Se ha guardado el historial de revisión de multas." });
  }, [toast, allVehicles]);
  
  const handleOpenDriverDialog = useCallback((driver: Driver | null = null) => { setEditingDriver(driver); setIsDriverDialogOpen(true); }, []);
  const handleSaveDriver = useCallback(async (formData: DriverFormValues) => {
    await personnelService.saveDriver(formData, editingDriver?.id);
    toast({ title: `Conductor ${editingDriver ? 'Actualizado' : 'Creado'}` });
    setIsDriverDialogOpen(false);
  }, [editingDriver, toast]);

  if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Flotilla</h1>
        <p className="text-primary-foreground/80 mt-1">Administra vehículos y conductores de tu flotilla.</p>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full">
            <TabsList className="h-auto flex flex-wrap w-full gap-2 sm:gap-4 p-0 bg-transparent">
                <TabsTrigger value="conductores" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Conductores</TabsTrigger>
                <TabsTrigger value="vehiculos" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base break-words whitespace-normal leading-snug data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80">Vehículos</TabsTrigger>
            </TabsList>
        </div>
        <TabsContent value="conductores" className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Lista de Conductores</h2>
                    <p className="text-muted-foreground">Gestiona los perfiles de los conductores de la flotilla.</p>
                </div>
                <Button onClick={() => handleOpenDriverDialog()}><PlusCircle className="mr-2 h-4 w-4" />Nuevo Conductor</Button>
            </div>
            <div className="flex items-center gap-2 mt-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="Buscar por nombre o teléfono..." className="w-full sm:w-1/2 lg:w-1/3 pl-8 bg-card" value={searchTermDrivers} onChange={e => setSearchTermDrivers(e.target.value)} />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 bg-card">
                          <ListFilter className="mr-2 h-4 w-4" /> Ordenar
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={sortOptionDrivers} onValueChange={(v) => setSortOptionDrivers(v as DriverSortOption)}>
                          <DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" className="bg-card" onClick={() => setShowArchivedDrivers(!showArchivedDrivers)}>
                    {showArchivedDrivers ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                    {showArchivedDrivers ? "Ver Activos" : "Ver Archivados"}
                </Button>
            </div>
            <Card className="mt-4"><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Teléfono</TableHead><TableHead>Vehículo Asignado</TableHead><TableHead className="text-right">Depósito</TableHead></TableRow></TableHeader><TableBody>{filteredDrivers.length > 0 ? filteredDrivers.map(driver => (<TableRow key={driver.id} className="cursor-pointer" onClick={() => router.push(`/conductores/${driver.id}`)}><TableCell className="font-semibold">{driver.name}</TableCell><TableCell>{driver.phone}</TableCell><TableCell>{allVehicles.find(v => v.id === driver.assignedVehicleId)?.licensePlate || 'N/A'}</TableCell><TableCell className="text-right">{driver.depositAmount ? formatCurrency(driver.depositAmount) : 'N/A'}</TableCell></TableRow>)) : <TableRow><TableCell colSpan={4} className="h-24 text-center">{showArchivedDrivers ? "No hay conductores archivados." : "No se encontraron conductores activos."}</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
        </TabsContent>
        <TabsContent value="vehiculos" className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div><h2 className="text-2xl font-semibold tracking-tight">Vehículos de la Flotilla</h2><p className="text-muted-foreground">Gestiona los vehículos que forman parte de tu flotilla.</p></div>
              <div className="flex flex-col sm:flex-row gap-2"><Button variant="secondary" onClick={() => setIsFineCheckDialogOpen(true)}><ShieldCheck className="mr-2 h-4 w-4" />Revisar Multas</Button><Button onClick={() => setIsAddVehicleDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Añadir Vehículo</Button></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar por placa, marca, modelo o propietario..." className="w-full pl-8" value={searchTermVehicles} onChange={e => setSearchTermVehicles(e.target.value)} />
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                        <ListFilter className="mr-2 h-4 w-4" /> Ordenar
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={sortOptionVehicles} onValueChange={(v) => setSortOptionVehicles(v as FlotillaSortOption)}>
                        <DropdownMenuRadioItem value="plate_asc">Placa (A-Z)</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="plate_desc">Placa (Z-A)</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Card className="mt-4"><CardContent><Table><TableHeader><TableRow><TableHead>Placa</TableHead><TableHead>Vehículo</TableHead><TableHead>Conductor</TableHead><TableHead>Propietario</TableHead><TableHead className="text-right">Renta Diaria</TableHead></TableRow></TableHeader><TableBody>{filteredFleetVehicles.length > 0 ? filteredFleetVehicles.map(v => {
            const driver = allDrivers.find(d => d.id === v.assignedVehicleId && !d.isArchived);
            const isAssigned = !!driver;
            return (
              <TableRow key={v.id} className={cn("cursor-pointer hover:bg-muted/50", !isAssigned && "bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/40")} onClick={() => router.push(`/flotilla/${v.id}`)}>
                <TableCell className="font-medium">{v.licensePlate}</TableCell>
                <TableCell>{v.make} {v.model} {v.year}</TableCell>
                <TableCell>{isAssigned ? driver.name : <span className="font-semibold">NO ASIGNADO</span>}</TableCell>
                <TableCell>{v.ownerName}</TableCell>
                <TableCell className="text-right font-semibold">${(v.dailyRentalCost || 0).toFixed(2)}</TableCell>
              </TableRow>
            )
          }) : <TableRow><TableCell colSpan={5} className="h-24 text-center">No hay vehículos en la flotilla.</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
        </TabsContent>
      </Tabs>
      <AddVehicleToFleetDialog open={isAddVehicleDialogOpen} onOpenChange={setIsAddVehicleDialogOpen} vehicles={nonFleetVehicles} onAddVehicle={handleAddVehicleToFleet} />
      <FineCheckDialog open={isFineCheckDialogOpen} onOpenChange={setIsFineCheckDialogOpen} fleetVehicles={fleetVehicles} onConfirm={handleConfirmFineCheck} />
      <DriverDialog open={isDriverDialogOpen} onOpenChange={setIsDriverDialogOpen} driver={editingDriver} onSave={handleSaveDriver} />
    </>
  );
}
