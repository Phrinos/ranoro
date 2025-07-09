"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Search, CalendarX, AlertTriangle, Archive, ListFilter, Filter, Car, Loader2, Database } from "lucide-react";
import { VehiclesTable } from "./components/vehicles-table";
import { VehicleDialog } from "./components/vehicle-dialog";
import { placeholderVehicles, placeholderServiceRecords, persistToFirestore, hydrateReady, placeholderVehiclePriceLists } from "@/lib/placeholder-data";
import type { Vehicle, VehiclePriceList } from "@/types";
import type { VehicleFormValues } from "./components/vehicle-form";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { subMonths, parseISO, isBefore, compareAsc, compareDesc, isValid } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PriceListDialog } from '../precios/components/price-list-dialog';
import type { PriceListFormValues } from '../precios/components/price-list-form';
import { Edit, Trash2 } from 'lucide-react';


// --- START CONTENT FOR LISTA DE PRECIOS ---
function PriceListPageContent() {
  const [priceLists, setPriceLists] = useState<VehiclePriceList[]>(placeholderVehiclePriceLists);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VehiclePriceList | null>(null);
  const { toast } = useToast();

  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return priceLists;
    const lowerSearch = searchTerm.toLowerCase();
    return priceLists.filter(record => 
      record.make.toLowerCase().includes(lowerSearch) ||
      record.model.toLowerCase().includes(lowerSearch) ||
      record.years.some(year => String(year).includes(lowerSearch))
    );
  }, [priceLists, searchTerm]);

  const handleOpenDialog = useCallback((record: VehiclePriceList | null = null) => {
    setEditingRecord(record);
    setIsDialogOpen(true);
  }, []);

  const handleSaveRecord = useCallback(async (formData: PriceListFormValues) => {
    let updatedList: VehiclePriceList[];

    if (editingRecord) {
      updatedList = priceLists.map(rec => 
        rec.id === editingRecord.id ? { ...editingRecord, ...formData } : rec
      );
      toast({ title: "Lista de Precios Actualizada", description: `La lista para ${formData.make} ${formData.model} ha sido actualizada.` });
    } else {
      const newRecord: VehiclePriceList = {
        id: `VPL_${Date.now().toString(36)}`,
        ...formData,
      };
      updatedList = [...priceLists, newRecord];
      toast({ title: "Lista de Precios Creada", description: `Se ha añadido la lista para ${formData.make} ${formData.model}.` });
    }

    setPriceLists(updatedList);
    placeholderVehiclePriceLists.splice(0, placeholderVehiclePriceLists.length, ...updatedList);
    await persistToFirestore(['vehiclePriceLists']);
    setIsDialogOpen(false);
  }, [editingRecord, priceLists, toast]);
  
  const handleDeleteRecord = useCallback(async (recordId: string) => {
    const recordToDelete = priceLists.find(r => r.id === recordId);
    if (!recordToDelete) return;

    const updatedList = priceLists.filter(rec => rec.id !== recordId);
    setPriceLists(updatedList);
    placeholderVehiclePriceLists.splice(0, placeholderVehiclePriceLists.length, ...updatedList);
    await persistToFirestore(['vehiclePriceLists']);

    toast({
      title: "Registro Eliminado",
      description: `La lista de precios para "${recordToDelete.make} ${recordToDelete.model}" ha sido eliminada.`,
      variant: 'destructive',
    });
  }, [priceLists, toast]);
  
  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const formatYearRange = (years: number[]): string => {
    if (!years || years.length === 0) return 'N/A';
    const sortedYears = [...years].sort((a, b) => a - b);
    return sortedYears.join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Lista de Precios por Vehículo</h2>
          <p className="text-muted-foreground">Base de datos de servicios y precios para agilizar cotizaciones.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Lista por Vehículo
        </Button>
      </div>
       <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por marca, modelo o año..."
            className="w-full rounded-lg bg-card pl-8 md:w-1/2 lg:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredRecords.length > 0 ? filteredRecords.map(record => (
          <Card key={record.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    {record.make} {record.model}
                  </CardTitle>
                  <Badge variant="outline" className="font-mono">{formatYearRange(record.years)}</Badge>
              </div>
              <CardDescription>
                  {record.services.length} servicio(s) estandarizado(s) para este modelo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 flex-grow">
              <h4 className="font-semibold text-sm mb-2">Servicios Disponibles:</h4>
              <ScrollArea className="h-40 pr-3">
                <div className="space-y-3">
                    {record.services.map((service) => (
                        <div key={service.id} className="text-sm p-2 border rounded-md bg-muted/50">
                            <div className="flex justify-between items-center">
                                <span className="font-medium text-foreground">{service.serviceName}</span>
                                <span className="font-bold text-primary">{formatCurrency(service.customerPrice)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate" title={service.description}>{service.description}</p>
                        </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 bg-muted/50 p-3 mt-auto">
              <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(record)}>
                <Edit className="h-4 w-4"/>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/90">
                    <Trash2 className="h-4 w-4"/>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar esta lista de precios?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente la lista de precios para &quot;{record.make} {record.model}&quot;.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteRecord(record.id)} className="bg-destructive hover:bg-destructive/90">
                        Sí, Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        )) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Database className="mx-auto h-12 w-12 mb-2" />
            <h3 className="text-lg font-semibold text-foreground">No hay listas de precios</h3>
            <p className="text-sm">Cuando se cree una lista, aparecerá aquí.</p>
          </div>
        )}
      </div>

      <PriceListDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveRecord}
        record={editingRecord}
      />
    </div>
  )
}
// --- END CONTENT FOR LISTA DE PRECIOS ---


function VehiculosPageComponent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'resumen';
  const { toast } = useToast();
  const [version, setVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [isNewVehicleDialogOpen, setIsNewVehicleDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [sortOption, setSortOption] = useState<string>("date_asc");
  const [activityCounts, setActivityCounts] = useState({ inactive6MonthsCount: 0, inactive12MonthsCount: 0 });

  useEffect(() => {
    hydrateReady.then(() => setHydrated(true));
    const forceUpdate = () => setVersion(v => v + 1);
    window.addEventListener('databaseUpdated', forceUpdate);
    return () => window.removeEventListener('databaseUpdated', forceUpdate);
  }, []);

  const vehiclesWithLastService = useMemo(() => {
    if (!hydrated) return [];
    return placeholderVehicles.map(v => {
      const history = placeholderServiceRecords.filter(s => s.vehicleId === v.id && s.status !== 'Cancelado');
      let lastServiceDate: string | undefined = undefined;
      if (history.length > 0) {
        const sortedHistory = [...history].sort((a, b) => {
            const dateA = a.serviceDate ? parseISO(a.serviceDate) : null;
            const dateB = b.serviceDate ? parseISO(b.serviceDate) : null;
            if (isValid(dateA) && !isValid(dateB)) return -1;
            if (!isValid(dateA) && isValid(dateB)) return 1;
            if (!isValid(dateA) && !isValid(dateB)) return 0;
            return compareDesc(dateA!, dateB!);
        });
        if (sortedHistory[0]?.serviceDate && isValid(parseISO(sortedHistory[0].serviceDate))) {
          lastServiceDate = sortedHistory[0].serviceDate;
        }
      }
      return { ...v, serviceHistory: history, lastServiceDate: lastServiceDate };
    });
  }, [version, hydrated]);

  const totalVehiclesCount = useMemo(() => vehiclesWithLastService.length, [vehiclesWithLastService]);

  useEffect(() => {
    if (!hydrated) return;
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 6);
    const twelveMonthsAgo = subMonths(now, 12);
    let count6 = 0;
    let count12 = 0;

    vehiclesWithLastService.forEach(v => {
      if (!v.lastServiceDate) {
        count6++;
        count12++;
      } else {
        const lastService = parseISO(v.lastServiceDate);
        if (!isValid(lastService)) return;
        if (isBefore(lastService, sixMonthsAgo)) count6++;
        if (isBefore(lastService, twelveMonthsAgo)) count12++;
      }
    });
    setActivityCounts({ inactive6MonthsCount: count6, inactive12MonthsCount: count12 });
  }, [vehiclesWithLastService, hydrated]);


  const handleSaveVehicle = async (data: VehicleFormValues) => {
    const newVehicleData: Omit<Vehicle, 'id' | 'serviceHistory' | 'lastServiceDate'> = {
      ...data,
      year: Number(data.year),
    };
    const newVehicle: Vehicle = {
      id: `VEH_${Date.now().toString(36)}`,
      ...newVehicleData,
      serviceHistory: [],
    };
    placeholderVehicles.push(newVehicle);
    await persistToFirestore(['vehicles']);
    toast({ title: "Vehículo Creado", description: `El vehículo ${newVehicle.make} ${newVehicle.model} ha sido agregado.` });
    setIsNewVehicleDialogOpen(false);
  };

  const filteredAndSortedVehicles = useMemo(() => {
    let itemsToDisplay = [...vehiclesWithLastService];

    if (searchTerm) {
      itemsToDisplay = itemsToDisplay.filter(vehicle =>
        vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (activityFilter !== "all") {
      const now = new Date();
      const monthsToCompare = activityFilter === 'inactive6' ? 6 : 12;
      const thresholdDate = subMonths(now, monthsToCompare);

      itemsToDisplay = itemsToDisplay.filter(v => {
        if (!v.lastServiceDate) return true;
        const lastServiceDate = parseISO(v.lastServiceDate);
        if(!isValid(lastServiceDate)) return false;
        return isBefore(lastServiceDate, thresholdDate);
      });
    }
    
    itemsToDisplay.sort((a, b) => {
      let comparison = 0;
      const dateA = a.lastServiceDate ? parseISO(a.lastServiceDate) : null;
      const dateB = b.lastServiceDate ? parseISO(b.lastServiceDate) : null;

      switch (sortOption) {
        case 'plate_asc':
          comparison = a.licensePlate.localeCompare(b.licensePlate);
          break;
        case 'plate_desc':
          comparison = b.licensePlate.localeCompare(a.licensePlate);
          break;
        case 'date_asc': 
          if (dateA === null && dateB !== null) comparison = -1;
          else if (dateA !== null && dateB === null) comparison = 1;
          else if (dateA === null && dateB === null) comparison = 0;
          else if (isValid(dateA) && isValid(dateB)) comparison = compareAsc(dateA, dateB);
          break;
        case 'date_desc': 
          if (dateA !== null && dateB === null) comparison = -1;
          else if (dateA === null && dateB !== null) comparison = 1;
          else if (dateA === null && dateB === null) comparison = 0;
          else if (isValid(dateA) && isValid(dateB)) comparison = compareDesc(dateA, dateB);
          break;
        default:
          if (dateA === null && dateB !== null) comparison = -1;
          else if (dateA !== null && dateB === null) comparison = 1;
          else if (dateA === null && dateB === null) comparison = 0;
          else if (isValid(dateA) && isValid(dateB)) comparison = compareAsc(dateA, dateB);
          break;
      }
      return comparison;
    });

    return itemsToDisplay;
  }, [vehiclesWithLastService, searchTerm, activityFilter, sortOption]);

  const handleShowArchived = () => {
    toast({
      title: "Función Próximamente",
      description: "La visualización de vehículos archivados estará disponible en una futura actualización.",
    });
  };

  if (!hydrated) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-lg ml-4">Cargando vehículos...</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Vehículos</h1>
          <p className="text-primary-foreground/80 mt-1">Administra la información, historial y precios de tus vehículos.</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="resumen" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Resumen</TabsTrigger>
            <TabsTrigger value="vehiculos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Vehículos</TabsTrigger>
            <TabsTrigger value="precios" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Lista de Precios</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-6 space-y-6">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total de Vehículos Registrados</CardTitle><Car className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalVehiclesCount}</div><p className="text-xs text-muted-foreground">Total de vehículos en el sistema.</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Inactivos (6+ meses)</CardTitle><CalendarX className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{activityCounts.inactive6MonthsCount}</div><p className="text-xs text-muted-foreground">Potencialmente necesitan seguimiento.</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Inactivos (12+ meses)</CardTitle><AlertTriangle className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{activityCounts.inactive12MonthsCount}</div><p className="text-xs text-muted-foreground">Considerar contactar para mantenimiento.</p></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="vehiculos" className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Lista de Vehículos</h2>
                <p className="text-muted-foreground">Administra la información y el historial de servicios.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="secondary" onClick={handleShowArchived} className="w-full sm:w-auto"><Archive className="mr-2 h-4 w-4" />Ver Archivados</Button>
                <Button onClick={() => setIsNewVehicleDialogOpen(true)} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" />Nuevo Vehículo</Button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center sm:flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar por placa, marca, modelo o propietario..." className="w-full rounded-lg bg-card pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="min-w-[150px] flex-1 sm:flex-initial bg-card"><ListFilter className="mr-2 h-4 w-4" />Ordenar</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Ordenar por</DropdownMenuLabel><DropdownMenuRadioGroup value={sortOption} onValueChange={setSortOption}><DropdownMenuRadioItem value="date_asc">Últ. Servicio (Antiguo a Nuevo)</DropdownMenuRadioItem><DropdownMenuRadioItem value="date_desc">Últ. Servicio (Nuevo a Antiguo)</DropdownMenuRadioItem><DropdownMenuRadioItem value="plate_asc">Placa (A-Z)</DropdownMenuRadioItem><DropdownMenuRadioItem value="plate_desc">Placa (Z-A)</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="min-w-[180px] flex-1 sm:flex-initial bg-card"><Filter className="mr-2 h-4 w-4" />Filtrar Actividad</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Filtrar por Actividad</DropdownMenuLabel><DropdownMenuRadioGroup value={activityFilter} onValueChange={setActivityFilter}><DropdownMenuRadioItem value="all">Todos los vehículos</DropdownMenuRadioItem><DropdownMenuRadioItem value="inactive6">Sin servicio (6+ meses)</DropdownMenuRadioItem><DropdownMenuRadioItem value="inactive12">Sin servicio (12+ meses)</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
            </div>
            
            <Card><CardContent className="p-0"><VehiclesTable vehicles={filteredAndSortedVehicles} /></CardContent></Card>
        </TabsContent>

        <TabsContent value="precios" className="mt-6">
            <PriceListPageContent />
        </TabsContent>
      </Tabs>
      
      <VehicleDialog
        open={isNewVehicleDialogOpen}
        onOpenChange={setIsNewVehicleDialogOpen}
        onSave={handleSaveVehicle}
        vehicle={null} 
      />
    </>
  );
}

export default function VehiculosPageWrapper() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <VehiculosPageComponent />
        </Suspense>
    );
}
