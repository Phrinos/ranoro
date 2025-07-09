

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PlusCircle, Search, CalendarX, AlertTriangle, ListFilter, Filter, Car, Loader2, Database, Users, Truck, TrendingUp, Edit, Trash2 } from "lucide-react";
import { VehiclesTable } from "./components/vehicles-table";
import { VehicleDialog } from "./components/vehicle-dialog";
import { placeholderVehicles, placeholderServiceRecords, persistToFirestore, hydrateReady, placeholderVehiclePriceLists } from "@/lib/placeholder-data";
import type { Vehicle, VehiclePriceList } from "@/types";
import type { VehicleFormValues } from "./components/vehicle-form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { subMonths, parseISO, isBefore, compareAsc, compareDesc, isValid } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PriceListDialog } from '../precios/components/price-list-dialog';
import type { PriceListFormValues } from '../precios/components/price-list-form';
import { formatCurrency } from '@/lib/utils';


// --- START CONTENT FOR RESUMEN ---
function ResumenVehiculosPageComponent({ summaryData, onNewVehicleClick }: {
    summaryData: {
        totalVehiclesCount: number;
        inactive6MonthsCount: number;
        inactive12MonthsCount: number;
        uniqueOwnersCount: number;
        fleetVehiclesCount: number;
        mostCommonVehicle: string;
    };
    onNewVehicleClick: () => void;
}) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Resumen General de Vehículos</h2>
                <p className="text-muted-foreground">Indicadores clave de tu base de datos de vehículos.</p>
              </div>
              <Button onClick={onNewVehicleClick} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Registrar Nuevo Vehículo
              </Button>
            </div>

            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Vehículos</CardTitle>
                  <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryData.totalVehiclesCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Propietarios Únicos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryData.uniqueOwnersCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vehículo Más Común</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold truncate" title={summaryData.mostCommonVehicle}>{summaryData.mostCommonVehicle}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vehículos en Flotilla</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryData.fleetVehiclesCount}</div>
                </CardContent>
              </Card>
              <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Inactivos (6+ meses)</CardTitle>
                  <CalendarX className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryData.inactive6MonthsCount}</div>
                </CardContent>
              </Card>
              <Card className="border-red-500/50 bg-red-50 dark:bg-red-900/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300">Inactivos (12+ meses)</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summaryData.inactive12MonthsCount}</div>
                </CardContent>
              </Card>
            </div>
        </div>
    );
}

// --- START CONTENT FOR LISTA DE VEHICULOS ---
function ListaVehiculosPageContent({ vehicles }: { vehicles: Vehicle[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activityFilter, setActivityFilter] = useState("all");
  const [sortOption, setSortOption] = useState<string>("date_asc");

  const filteredAndSortedVehicles = useMemo(() => {
    let itemsToDisplay = [...vehicles];

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
  }, [vehicles, searchTerm, activityFilter, sortOption]);

  return (
    <div className="mt-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Lista de Vehículos</h2>
            <p className="text-muted-foreground">Administra la información y el historial de servicios.</p>
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
    </div>
  );
}


// --- START CONTENT FOR PRECOTIZACIONES ---
function PrecotizacionesPageContent({ 
  priceLists, 
  onSave, 
  onDelete,
  onOpenDialog
}: {
  priceLists: VehiclePriceList[];
  onSave: (data: PriceListFormValues) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenDialog: (record?: VehiclePriceList) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return priceLists;
    const lowerSearch = searchTerm.toLowerCase();
    return priceLists.filter(record => 
      record.make.toLowerCase().includes(lowerSearch) ||
      record.model.toLowerCase().includes(lowerSearch) ||
      record.years.some(year => String(year).includes(lowerSearch))
    );
  }, [priceLists, searchTerm]);
  
  const formatYearRange = (years: number[]): string => {
    if (!years || years.length === 0) return 'N/A';
    
    const sortedYears = [...years].sort((a, b) => a - b);
    if (sortedYears.length === 1) return String(sortedYears[0]);
    
    const ranges: string[] = [];
    let rangeStart = sortedYears[0];

    for (let i = 1; i < sortedYears.length; i++) {
        if (sortedYears[i] !== sortedYears[i - 1] + 1) {
            const rangeEnd = sortedYears[i - 1];
            if (rangeStart === rangeEnd) {
                ranges.push(String(rangeStart));
            } else {
                ranges.push(`${rangeStart} - ${rangeEnd}`);
            }
            rangeStart = sortedYears[i];
        }
    }
    
    const lastYear = sortedYears[sortedYears.length - 1];
    if (rangeStart === lastYear) {
      ranges.push(String(rangeStart));
    } else {
      ranges.push(`${rangeStart} - ${lastYear}`);
    }

    return ranges.join(', ');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Precotizaciones por Vehículo</h2>
          <p className="text-muted-foreground">Base de datos de servicios y precios para agilizar cotizaciones.</p>
        </div>
        <Button onClick={() => onOpenDialog()}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Precotización
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
      
      <div className="space-y-4">
        {filteredRecords.length > 0 ? filteredRecords.map(record => (
          <Card key={record.id} className="overflow-hidden">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 px-4 border-b bg-card">
                <div className="flex items-baseline gap-x-3">
                  <p className="text-lg text-muted-foreground">{record.make}</p>
                  <p className="text-xl font-semibold text-foreground">{record.model}</p>
                  <p className="text-xl font-semibold text-foreground">{formatYearRange(record.years)}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge>{record.services.length} servicio(s)</Badge>
                    <Button variant="ghost" size="icon" onClick={() => onOpenDialog(record)}><Edit className="h-4 w-4"/></Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar esta precotización?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente la precotización para &quot;{record.make} {record.model}&quot;.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(record.id)} className="bg-destructive hover:bg-destructive/90">
                                Sí, Eliminar
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardHeader>
            <CardContent className="p-0 bg-muted/30">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-2/5">Servicio</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right">Precio Cliente</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {record.services.map((service) => (
                            <TableRow key={service.id}>
                                <TableCell className="font-medium">{service.serviceName}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{service.description}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(service.customerPrice)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Database className="mx-auto h-12 w-12 mb-2" />
            <h3 className="text-lg font-semibold text-foreground">No hay precotizaciones</h3>
            <p className="text-sm">Cuando se cree una, aparecerá aquí.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---
function VehiculosPageComponent() {
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'resumen';
    const { toast } = useToast();
    const [version, setVersion] = useState(0);
    const [hydrated, setHydrated] = useState(false);
    const [activeTab, setActiveTab] = useState(defaultTab);
    
    // State for dialogs
    const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
    const [isPriceListDialogOpen, setIsPriceListDialogOpen] = useState(false);
    const [editingPriceRecord, setEditingPriceRecord] = useState<VehiclePriceList | null>(null);
    
    // State for data
    const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
    const [priceLists, setPriceLists] = useState<VehiclePriceList[]>([]);
  
    useEffect(() => {
      const handleDatabaseUpdate = () => setVersion(v => v + 1);
      hydrateReady.then(() => {
        setAllVehicles([...placeholderVehicles]);
        setPriceLists([...placeholderVehiclePriceLists]);
        setHydrated(true);
      });
      window.addEventListener('databaseUpdated', handleDatabaseUpdate);
      return () => window.removeEventListener('databaseUpdated', handleDatabaseUpdate);
    }, []);

    useEffect(() => {
        if(hydrated) {
            setAllVehicles([...placeholderVehicles]);
            setPriceLists([...placeholderVehiclePriceLists]);
        }
    }, [version, hydrated]);

    const vehiclesWithLastService = useMemo(() => {
        return allVehicles.map(v => {
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
    }, [allVehicles]);

    const summaryData = useMemo(() => {
        const now = new Date();
        const sixMonthsAgo = subMonths(now, 6);
        const twelveMonthsAgo = subMonths(now, 12);
        let count6 = 0; let count12 = 0;

        vehiclesWithLastService.forEach(v => {
            if (!v.lastServiceDate) {
                count6++; count12++;
            } else {
                const lastService = parseISO(v.lastServiceDate);
                if (!isValid(lastService)) return;
                if (isBefore(lastService, sixMonthsAgo)) count6++;
                if (isBefore(lastService, twelveMonthsAgo)) count12++;
            }
        });
        
        const vehicleCounts = vehiclesWithLastService.reduce((acc, v) => {
            const key = `${v.make} ${v.model}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const topEntry = Object.entries(vehicleCounts).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0]);

        return {
            totalVehiclesCount: vehiclesWithLastService.length,
            inactive6MonthsCount: count6,
            inactive12MonthsCount: count12,
            uniqueOwnersCount: new Set(vehiclesWithLastService.map(v => v.ownerName)).size,
            fleetVehiclesCount: vehiclesWithLastService.filter(v => v.isFleetVehicle).length,
            mostCommonVehicle: topEntry[0] || "N/A",
        };
    }, [vehiclesWithLastService]);

    const handleSaveVehicle = useCallback(async (data: VehicleFormValues) => {
        const newVehicleData: Omit<Vehicle, 'id' | 'serviceHistory' | 'lastServiceDate'> = {
            ...data, year: Number(data.year),
        };
        const newVehicle: Vehicle = {
            id: `VEH_${Date.now().toString(36)}`, ...newVehicleData, serviceHistory: [],
        };
        placeholderVehicles.push(newVehicle);
        await persistToFirestore(['vehicles']);
        toast({ title: "Vehículo Creado", description: `Se ha agregado ${newVehicle.make} ${newVehicle.model}.` });
        setIsVehicleDialogOpen(false);
    }, [toast]);

    const handleOpenPriceListDialog = useCallback((record: VehiclePriceList | null = null) => {
        setEditingPriceRecord(record);
        setIsPriceListDialogOpen(true);
    }, []);

    const handleSavePriceListRecord = useCallback(async (formData: PriceListFormValues) => {
        let isEditing = !!editingPriceRecord;
        if (isEditing) {
            const index = placeholderVehiclePriceLists.findIndex(r => r.id === editingPriceRecord!.id);
            if (index > -1) {
                placeholderVehiclePriceLists[index] = { ...editingPriceRecord!, ...formData };
            }
        } else {
            const newRecord: VehiclePriceList = { id: `VPL_${Date.now().toString(36)}`, ...formData };
            placeholderVehiclePriceLists.push(newRecord);
        }
        await persistToFirestore(['vehiclePriceLists']);
        toast({ title: `Precotización ${isEditing ? 'Actualizada' : 'Creada'}`, description: `Se ha guardado la lista para ${formData.make} ${formData.model}.` });
        setIsPriceListDialogOpen(false);
    }, [editingPriceRecord, toast]);
    
    const handleDeletePriceListRecord = useCallback(async (recordId: string) => {
        const recordToDelete = placeholderVehiclePriceLists.find(r => r.id === recordId);
        if (!recordToDelete) return;
        const index = placeholderVehiclePriceLists.findIndex(r => r.id === recordId);
        if (index > -1) {
            placeholderVehiclePriceLists.splice(index, 1);
            await persistToFirestore(['vehiclePriceLists']);
            toast({ title: "Registro Eliminado", variant: 'destructive' });
        }
    }, []);

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
                    <TabsTrigger value="precotizaciones" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Precotizaciones</TabsTrigger>
                </TabsList>

                <TabsContent value="resumen" className="mt-6">
                    <ResumenVehiculosPageComponent summaryData={summaryData} onNewVehicleClick={() => setIsVehicleDialogOpen(true)} />
                </TabsContent>

                <TabsContent value="vehiculos" className="mt-0">
                    <ListaVehiculosPageContent vehicles={vehiclesWithLastService} />
                </TabsContent>

                <TabsContent value="precotizaciones" className="mt-6">
                    <PrecotizacionesPageContent
                        priceLists={priceLists}
                        onSave={handleSavePriceListRecord}
                        onDelete={handleDeletePriceListRecord}
                        onOpenDialog={handleOpenPriceListDialog}
                    />
                </TabsContent>
            </Tabs>
            
            <VehicleDialog
                open={isVehicleDialogOpen}
                onOpenChange={setIsVehicleDialogOpen}
                onSave={handleSaveVehicle}
                vehicle={null} 
            />
            
            <PriceListDialog
                open={isPriceListDialogOpen}
                onOpenChange={setIsPriceListDialogOpen}
                onSave={handleSavePriceListRecord}
                record={editingPriceRecord}
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

