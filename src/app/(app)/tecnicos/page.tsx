
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { PlusCircle, ListFilter, TrendingUp, DollarSign as DollarSignIcon, CalendarIcon as CalendarDateIcon, BadgeCent, Users, Search, Archive } from "lucide-react";
import { TechniciansTable } from "./components/technicians-table";
import { TechnicianDialog } from "./components/technician-dialog";
import { placeholderTechnicians, placeholderServiceRecords } from "@/lib/placeholder-data";
import type { Technician, ServiceRecord } from "@/types";
import type { TechnicianFormValues } from "./components/technician-form";
import { parseISO, compareAsc, compareDesc, startOfMonth, endOfMonth, isWithinInterval, format, isValid, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";


type TechnicianSortOption = 
  | "name_asc" | "name_desc"
  | "area_asc" | "area_desc"
  | "hireDate_asc" | "hireDate_desc"
  | "salary_asc" | "salary_desc";


interface AggregatedTechnicianPerformance {
  technicianId: string;
  technicianName: string;
  totalRevenue: number;
  totalProfit: number;
  totalCommissionEarned: number; 
}

export default function TecnicosPage() {
  const [technicians, setTechnicians] = useState<Technician[]>(placeholderTechnicians);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<TechnicianSortOption>("name_asc");
  const [showArchived, setShowArchived] = useState(false);
  
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    // Initialize date range on client side to avoid hydration issues
    if (typeof window !== 'undefined') {
        const now = new Date();
        setFilterDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    }
  }, []);

  const handleSaveTechnician = async (data: TechnicianFormValues) => {
    const newTechnician: Technician = {
      id: `T${String(technicians.length + 1).padStart(3, '0')}${Date.now().toString().slice(-3)}`, 
      ...data,
      hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
      monthlySalary: Number(data.monthlySalary),
      commissionRate: data.commissionRate ? Number(data.commissionRate) : undefined,
      isArchived: false,
    };
    const updatedTechnicians = [...technicians, newTechnician];
    setTechnicians(updatedTechnicians);
    placeholderTechnicians.push(newTechnician);
  };
  
  const totalTechnicians = useMemo(() => technicians.filter(t => !t.isArchived).length, [technicians]);
  const totalMonthlyTechnicianSalaries = useMemo(() => {
      return technicians.filter(t => !t.isArchived).reduce((sum, tech) => sum + (tech.monthlySalary || 0), 0);
  }, [technicians]);

  const aggregatedTechnicianPerformance = useMemo((): AggregatedTechnicianPerformance[] => {
    if (!filterDateRange || !filterDateRange.from) {
      return []; // Return empty array on server and initial client render to prevent hydration error
    }

    let dateFrom = startOfDay(filterDateRange.from);
    let dateTo = filterDateRange.to ? endOfDay(filterDateRange.to) : endOfDay(filterDateRange.from);
    
    const activeTechnicians = technicians.filter(t => !t.isArchived);
    
    return activeTechnicians.map(tech => {
      const techServices = placeholderServiceRecords.filter(service => {
        if (service.technicianId !== tech.id) return false;
        if (service.status !== 'Completado') return false; // Only count completed services for commission
        const serviceDate = parseISO(service.serviceDate);
        if (!isValid(serviceDate)) return false;
        return isWithinInterval(serviceDate, { start: dateFrom, end: dateTo });
      });

      const totalRevenue = techServices.reduce((sum, s) => sum + s.totalCost, 0);
      const totalProfit = techServices.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
      const totalCommissionEarned = techServices.reduce((sum, s) => sum + (s.serviceProfit || 0) * (tech.commissionRate || 0), 0);
      
      return {
        technicianId: tech.id,
        technicianName: tech.name,
        totalRevenue,
        totalProfit,
        totalCommissionEarned,
      };
    });
  }, [technicians, filterDateRange]);


  const filteredAndSortedTechnicians = useMemo(() => {
    let itemsToDisplay = technicians.filter(tech => showArchived ? tech.isArchived === true : !tech.isArchived);

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      itemsToDisplay = itemsToDisplay.filter(tech =>
        tech.name.toLowerCase().includes(lowerSearchTerm) ||
        tech.area.toLowerCase().includes(lowerSearchTerm) ||
        tech.specialty.toLowerCase().includes(lowerSearchTerm) ||
        (tech.contactInfo && tech.contactInfo.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    itemsToDisplay.sort((a, b) => {
      switch (sortOption) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'area_asc': return a.area.localeCompare(b.area);
        case 'area_desc': return b.area.localeCompare(a.area);
        case 'hireDate_asc':
          if (!a.hireDate) return 1; 
          if (!b.hireDate) return -1;
          return compareAsc(parseISO(a.hireDate), parseISO(b.hireDate));
        case 'hireDate_desc':
          if (!a.hireDate) return 1; 
          if (!b.hireDate) return -1;
          return compareDesc(parseISO(a.hireDate), parseISO(b.hireDate));
        case 'salary_asc': return (a.monthlySalary || 0) - (b.monthlySalary || 0);
        case 'salary_desc': return (b.monthlySalary || 0) - (a.monthlySalary || 0);
        default: return a.name.localeCompare(b.name);
      }
    });
    return itemsToDisplay;
  }, [technicians, searchTerm, sortOption, showArchived]);

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };


  return (
    <>
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Staff Técnico Activo
            </CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{totalTechnicians}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Costo Total de Nómina Técnica (Mensual Base)
            </CardTitle>
            <DollarSignIcon className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{formatCurrency(totalMonthlyTechnicianSalaries)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Rendimiento Individual</CardTitle>
            <CardDescription>
              Comisiones potenciales ganadas por el staff técnico, basadas en servicios completados en el rango de fechas. La comisión final se calcula y liquida mensualmente si el taller es rentable (ver Resumen Financiero).
            </CardDescription>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full sm:w-[280px] justify-start text-left font-normal",
                  !filterDateRange && "text-muted-foreground"
                )}
              >
                <CalendarDateIcon className="mr-2 h-4 w-4" />
                {filterDateRange?.from ? (
                  filterDateRange.to ? (
                    <>
                      {format(filterDateRange.from, "LLL dd, y", { locale: es })} -{" "}
                      {format(filterDateRange.to, "LLL dd, y", { locale: es })}
                    </>
                  ) : (
                    format(filterDateRange.from, "LLL dd, y", { locale: es })
                  )
                ) : (
                  <span>Seleccione rango</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={filterDateRange?.from}
                selected={filterDateRange}
                onSelect={setFilterDateRange}
                numberOfMonths={2}
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          {aggregatedTechnicianPerformance.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {aggregatedTechnicianPerformance.map(techPerf => (
                <Card key={techPerf.technicianId} className="shadow-sm border">
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-base font-medium">{techPerf.technicianName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm pb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ingresos Totales:</span>
                      <span className="font-semibold">{formatCurrency(techPerf.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ganancia Total:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(techPerf.totalProfit)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1"><BadgeCent className="h-3.5 w-3.5"/>Comisión Potencial:</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(techPerf.totalCommissionEarned)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No hay datos de rendimiento para mostrar con el filtro actual.</p>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Lista de Staff Técnico</CardTitle>
          <CardDescription>Visualiza y gestiona al personal técnico.</CardDescription>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
            <div className="relative flex-1 sm:flex-initial w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Buscar por nombre, área..."
                  className="pl-8 w-full sm:w-[250px] lg:w-[300px] bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button variant="outline" className="w-full sm:w-auto bg-white" onClick={() => setShowArchived(!showArchived)}>
                    <Archive className="mr-2 h-4 w-4" />
                    {showArchived ? "Ver Activos" : "Ver Archivados"}
                </Button>
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto bg-white">
                    <ListFilter className="mr-2 h-4 w-4" />
                    Ordenar Tabla
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ordenar tabla por</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as TechnicianSortOption)}>
                    <DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="area_asc">Área (A-Z)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="area_desc">Área (Z-A)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="hireDate_asc">Fecha Contratación (Antiguo a Nuevo)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="hireDate_desc">Fecha Contratación (Nuevo a Antiguo)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="salary_asc">Sueldo (Menor a Mayor)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="salary_desc">Sueldo (Mayor a Menor)</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
                </DropdownMenu>
                <TechnicianDialog
                trigger={
                    <Button className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Técnico
                    </Button>
                }
                onSave={handleSaveTechnician}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TechniciansTable technicians={filteredAndSortedTechnicians} />
        </CardContent>
      </Card>
    </>
  );
}
