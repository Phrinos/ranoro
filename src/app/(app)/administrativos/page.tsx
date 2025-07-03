
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { PlusCircle, ListFilter, Search, Users, DollarSign, CalendarIcon as CalendarDateIcon, BadgeCent, Archive } from "lucide-react";
import { AdministrativeStaffTable } from "./components/administrative-staff-table";
import { AdministrativeStaffDialog } from "./components/administrative-staff-dialog";
import { placeholderAdministrativeStaff, placeholderServiceRecords, persistToFirestore, IVA_RATE } from "@/lib/placeholder-data";
import type { AdministrativeStaff } from "@/types";
import type { AdministrativeStaffFormValues } from "./components/administrative-staff-form";
import { useToast } from "@/hooks/use-toast";
import { parseISO, compareAsc, compareDesc, format, isValid, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; // Added this import
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

type StaffSortOption = 
  | "name_asc" | "name_desc"
  | "role_asc" | "role_desc"
  | "hireDate_asc" | "hireDate_desc"
  | "salary_asc" | "salary_desc";

interface AggregatedAdminStaffPerformance {
  staffId: string;
  staffName: string;
  baseSalary: number;
  commissionEarned: number; // "Potencial" commission
  totalEarnings: number;
}

export default function AdministrativosPage() {
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<AdministrativeStaff[]>(placeholderAdministrativeStaff);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<StaffSortOption>("name_asc");
  const [showArchived, setShowArchived] = useState(false);
  
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    // Initialize date range on client side to avoid hydration issues
    if (typeof window !== 'undefined') {
        const now = new Date();
        setFilterDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    }
  }, []);
  
  const handleSaveStaff = async (data: AdministrativeStaffFormValues) => {
    const newStaffMember: AdministrativeStaff = {
      id: `ADM_${Date.now().toString(36)}`, 
      ...data,
      hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
      monthlySalary: Number(data.monthlySalary) || undefined,
      commissionRate: data.commissionRate ? Number(data.commissionRate) : undefined,
      isArchived: false,
    };
    
    placeholderAdministrativeStaff.push(newStaffMember);
    setStaffList([...placeholderAdministrativeStaff]);

    persistToFirestore(['administrativeStaff']);

    toast({
        title: "Staff Creado",
        description: `${newStaffMember.name} ha sido agregado al staff administrativo.`,
    });
  };
  
  const filteredAndSortedStaff = useMemo(() => {
    let itemsToDisplay = staffList.filter(staff => showArchived ? staff.isArchived === true : !staff.isArchived);

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      itemsToDisplay = itemsToDisplay.filter(staff =>
        staff.name.toLowerCase().includes(lowerSearchTerm) ||
        staff.roleOrArea.toLowerCase().includes(lowerSearchTerm) ||
        (staff.contactInfo && staff.contactInfo.toLowerCase().includes(lowerSearchTerm))
      );
    }
    
    itemsToDisplay.sort((a, b) => {
      switch (sortOption) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'name_desc': return b.name.localeCompare(a.name);
        case 'role_asc': return a.roleOrArea.localeCompare(b.roleOrArea);
        case 'role_desc': return b.roleOrArea.localeCompare(a.roleOrArea);
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
  }, [staffList, searchTerm, sortOption, showArchived]);

  const totalAdministrativeStaff = useMemo(() => staffList.filter(s => !s.isArchived).length, [staffList]);
  const totalMonthlyAdministrativeSalaries = useMemo(() => {
    return staffList.filter(s => !s.isArchived).reduce((sum, staff) => sum + (staff.monthlySalary || 0), 0);
  }, [staffList]);

  const aggregatedAdminPerformance = useMemo((): AggregatedAdminStaffPerformance[] => {
    if (!filterDateRange || !filterDateRange.from) {
        return []; // Return empty array on server and initial client render to prevent hydration error
    }

    const dateFrom = startOfDay(filterDateRange.from);
    const dateTo = filterDateRange.to ? endOfDay(filterDateRange.to) : endOfDay(filterDateRange.from);

    const completedServicesInRange = placeholderServiceRecords.filter(service => {
        if (service.status !== 'Completado' || !service.deliveryDateTime) return false;
        const serviceDate = parseISO(service.deliveryDateTime);
        if (!isValid(serviceDate)) return false;
        return isWithinInterval(serviceDate, { start: dateFrom, end: dateTo });
    });

    const totalProfitFromCompletedServicesInRange = completedServicesInRange.reduce((sum, s) => {
        const revenueExclTax = (s.totalCost || 0) / (1 + IVA_RATE);
        const costOfSupplies = s.totalSuppliesCost || 0;
        const profit = revenueExclTax - costOfSupplies;
        return sum + (isFinite(profit) ? profit : 0);
    }, 0);

    const activeStaff = staffList.filter(s => !s.isArchived);

    return activeStaff.map(staff => {
      const commissionEarned = totalProfitFromCompletedServicesInRange * (staff.commissionRate || 0);
      const baseSalary = staff.monthlySalary || 0;
      return {
        staffId: staff.id,
        staffName: staff.name,
        baseSalary,
        commissionEarned, // This is "potential" commission
        totalEarnings: baseSalary + commissionEarned,
      };
    });
  }, [staffList, filterDateRange]);
  
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <>
      <div className="mb-6 grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Staff Administrativo
            </CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{totalAdministrativeStaff}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Costo Total de Nómina Admin. (Mensual Base)
            </CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{formatCurrency(totalMonthlyAdministrativeSalaries)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Rendimiento Individual</CardTitle>
            <CardDescription>
              Comisiones potenciales del staff basadas en servicios completados en el rango de fechas. La comisión final se paga mensualmente solo si el taller es rentable (ver Resumen Financiero).
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
          {aggregatedAdminPerformance.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {aggregatedAdminPerformance.map(staffPerf => (
                <Card key={staffPerf.staffId} className="shadow-sm border">
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-base font-medium">{staffPerf.staffName}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm pb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Salario Base:</span>
                      <span className="font-semibold">{formatCurrency(staffPerf.baseSalary)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1"><BadgeCent className="h-3.5 w-3.5"/>Comisión Potencial:</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(staffPerf.commissionEarned)}</span>
                    </div>
                     <div className="flex justify-between font-bold pt-1 border-t mt-1">
                      <span className="text-muted-foreground">Total Ganado (Potencial):</span>
                      <span className="text-green-600">{formatCurrency(staffPerf.totalEarnings)}</span>
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
          <CardTitle>Lista de Staff Administrativo</CardTitle>
          <CardDescription>Visualiza y gestiona al personal administrativo.</CardDescription>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
            <div className="relative flex-1 sm:flex-initial w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                  type="search"
                  placeholder="Buscar por nombre, rol..."
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
                    <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                    <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as StaffSortOption)}>
                    <DropdownMenuRadioItem value="name_asc">Nombre (A-Z)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_desc">Nombre (Z-A)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="role_asc">Rol/Área (A-Z)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="role_desc">Rol/Área (Z-A)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="hireDate_asc">Fecha Contratación (Antiguo a Nuevo)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="hireDate_desc">Fecha Contratación (Nuevo a Antiguo)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="salary_asc">Sueldo (Menor a Mayor)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="salary_desc">Sueldo (Mayor a Menor)</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
                </DropdownMenu>
                <AdministrativeStaffDialog
                trigger={
                    <Button className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nuevo Staff
                    </Button>
                }
                onSave={handleSaveStaff}
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <AdministrativeStaffTable staffList={filteredAndSortedStaff} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}
