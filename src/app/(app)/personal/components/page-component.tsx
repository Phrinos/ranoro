

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { PlusCircle, UserCheck, UserX, Search } from "lucide-react";
import { TechniciansTable } from "../../tecnicos/components/technicians-table";
import { AdministrativeStaffTable } from "../../administrativos/components/administrative-staff-table";
import { TechnicianDialog } from "../../tecnicos/components/technician-dialog";
import { AdministrativeStaffDialog } from "../../administrativos/components/administrative-staff-dialog";
import type { Technician, ServiceRecord, AdministrativeStaff, SaleReceipt, MonthlyFixedExpense } from "@/types";
import type { TechnicianFormValues } from "../../tecnicos/components/technician-form";
import type { AdministrativeStaffFormValues } from "../../administrativos/components/administrative-staff-form";
import { parseISO, isWithinInterval, format, isValid, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign as DollarSignIcon, CalendarIcon as CalendarDateIcon, BadgeCent } from 'lucide-react';
import { personnelService, operationsService, inventoryService } from '@/lib/services';
import { calculateSaleProfit } from '@/lib/placeholder-data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';


interface UnifiedPerformanceData {
  id: string;
  name: string;
  roles: string[];
  totalRevenue: number;
  baseSalary: number;
  totalCommissionEarned: number;
  totalEarnings: number;
}


export function PersonalPageComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { toast } = useToast();
  const defaultTab = (searchParams?.tab as string) || 'informe';
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [adminStaff, setAdminStaff] = useState<AdministrativeStaff[]>([]);
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [sales, setSales] = useState<SaleReceipt[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<MonthlyFixedExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTermTech, setSearchTermTech] = useState('');
  const [showArchivedTech, setShowArchivedTech] = useState(false);
  
  const [searchTermAdmin, setSearchTermAdmin] = useState('');
  const [showArchivedAdmin, setShowArchivedAdmin] = useState(false);

  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);
  
  const [isTechnicianDialogOpen, setIsTechnicianDialogOpen] = useState(false);
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);


  useEffect(() => {
    setIsLoading(true);
    const unsubs: (() => void)[] = [
      personnelService.onTechniciansUpdate(setTechnicians),
      personnelService.onAdminStaffUpdate(setAdminStaff),
      operationsService.onServicesUpdate(setServices),
      operationsService.onSalesUpdate(setSales),
      inventoryService.onItemsUpdate(setInventory),
      inventoryService.onFixedExpensesUpdate((expenses) => {
        setFixedExpenses(expenses);
        setIsLoading(false);
      })
    ];

    const now = new Date();
    setFilterDateRange({ from: startOfMonth(now), to: endOfMonth(now) });

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const handleSaveTechnician = async (data: TechnicianFormValues) => {
    try {
      await personnelService.addTechnician(data);
      toast({ title: "Técnico Creado" });
      setIsTechnicianDialogOpen(false);
    } catch (e) {
      toast({ title: "Error al crear técnico", variant: "destructive" });
    }
  };
  
  const handleSaveAdminStaff = async (data: AdministrativeStaffFormValues) => {
    try {
      await personnelService.addAdminStaff(data);
      toast({ title: "Staff Administrativo Creado" });
      setIsStaffDialogOpen(false);
    } catch (e) {
      toast({ title: "Error al crear staff", variant: "destructive" });
    }
  };
  
  const {
      totalTechnicians, totalMonthlyTechnicianSalaries,
      totalAdministrativeStaff, totalMonthlyAdministrativeSalaries,
      unifiedPerformanceData
  } = useMemo(() => {
    const emptyResult = { totalTechnicians: 0, totalMonthlyTechnicianSalaries: 0, totalAdministrativeStaff: 0, totalMonthlyAdministrativeSalaries: 0, unifiedPerformanceData: [] };
    if (isLoading || !filterDateRange?.from) return emptyResult;

    const dateFrom = startOfDay(filterDateRange.from);
    const dateTo = filterDateRange.to ? endOfDay(filterDateRange.to) : endOfDay(filterDateRange.from);

    const activeTechnicians = technicians.filter(t => !t.isArchived);
    const activeAdminStaff = adminStaff.filter(s => !s.isArchived);

    const completedServicesInRange = services.filter(s => s.status === 'Entregado' && s.deliveryDateTime && isWithinInterval(parseISO(s.deliveryDateTime), { start: dateFrom, end: dateTo }));
    const completedSalesInRange = sales.filter(s => s.status !== 'Cancelado' && s.saleDate && isWithinInterval(parseISO(s.saleDate), { start: dateFrom, end: dateTo }));

    const totalProfitFromServices = completedServicesInRange.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
    const totalProfitFromSales = completedSalesInRange.reduce((sum, s) => sum + calculateSaleProfit(s, inventory), 0);
    const totalOperationalProfit = totalProfitFromServices + totalProfitFromSales;
    
    const totalBaseTechSalaries = activeTechnicians.reduce((sum, tech) => sum + (tech.monthlySalary || 0), 0);
    const totalBaseAdminSalaries = activeAdminStaff.reduce((sum, staff) => sum + (staff.monthlySalary || 0), 0);
    const totalFixedSystemExpenses = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    const netProfitForCommissions = totalOperationalProfit - (totalBaseTechSalaries + totalBaseAdminSalaries + totalFixedSystemExpenses);
    const isProfitableForCommissions = netProfitForCommissions > 0;

    const performanceMap = new Map<string, UnifiedPerformanceData>();

    // Helper to initialize or get a performance record
    const getPerformanceRecord = (id: string, name: string): UnifiedPerformanceData => {
        if (!performanceMap.has(id)) {
            performanceMap.set(id, { id, name, roles: [], totalRevenue: 0, baseSalary: 0, totalCommissionEarned: 0, totalEarnings: 0 });
        }
        return performanceMap.get(id)!;
    };

    activeTechnicians.forEach(tech => {
        const record = getPerformanceRecord(tech.id, tech.name);
        if (!record.roles.includes('Técnico')) record.roles.push('Técnico');
        
        const techServices = completedServicesInRange.filter(s => s.technicianId === tech.id);
        record.totalRevenue += techServices.reduce((sum, s) => sum + (s.totalCost || 0), 0);
        record.baseSalary = Math.max(record.baseSalary, tech.monthlySalary || 0); // Take the highest salary if duplicated
        
        if (isProfitableForCommissions) {
            record.totalCommissionEarned += netProfitForCommissions * (tech.commissionRate || 0);
        }
    });

    activeAdminStaff.forEach(staff => {
        const record = getPerformanceRecord(staff.id, staff.name);
        if (!record.roles.includes('Administrativo')) record.roles.push('Administrativo');
        
        record.baseSalary = Math.max(record.baseSalary, staff.monthlySalary || 0);
        
        if (isProfitableForCommissions) {
            record.totalCommissionEarned += netProfitForCommissions * (staff.commissionRate || 0);
        }
    });

    performanceMap.forEach(record => {
        record.totalEarnings = record.baseSalary + record.totalCommissionEarned;
    });

    return {
        totalTechnicians: activeTechnicians.length,
        totalMonthlyTechnicianSalaries: totalBaseTechSalaries,
        totalAdministrativeStaff: activeAdminStaff.length,
        totalMonthlyAdministrativeSalaries: totalBaseAdminSalaries,
        unifiedPerformanceData: Array.from(performanceMap.values())
    };
  }, [technicians, adminStaff, services, sales, inventory, fixedExpenses, filterDateRange, isLoading]);

  const filteredTechnicians = useMemo(() => {
    let items = technicians.filter(tech => showArchivedTech ? !!tech.isArchived : !tech.isArchived);
    if (searchTermTech) {
      const lowerSearch = searchTermTech.toLowerCase();
      items = items.filter(tech => tech.name.toLowerCase().includes(lowerSearch) || tech.area.toLowerCase().includes(lowerSearch) || tech.specialty.toLowerCase().includes(lowerSearch));
    }
    return items.sort((a,b) => a.name.localeCompare(b.name));
  }, [technicians, showArchivedTech, searchTermTech]);

  const filteredAdminStaff = useMemo(() => {
    let items = adminStaff.filter(staff => showArchivedAdmin ? !!staff.isArchived : !staff.isArchived);
    if (searchTermAdmin) {
       const lowerSearch = searchTermAdmin.toLowerCase();
       items = items.filter(staff => staff.name.toLowerCase().includes(lowerSearch) || staff.roleOrArea.toLowerCase().includes(lowerSearch));
    }
    return items.sort((a,b) => a.name.localeCompare(b.name));
  }, [adminStaff, showArchivedAdmin, searchTermAdmin]);

  if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }
  
  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Personal</h1>
          <p className="text-primary-foreground/80 mt-1">Administra la información, roles y rendimiento de todo tu personal.</p>
      </div>

       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full">
          <TabsList className="flex flex-wrap w-full gap-2 sm:gap-4 p-0 bg-transparent">
            <TabsTrigger value="informe" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80 break-words whitespace-normal leading-snug">Informe</TabsTrigger>
            <TabsTrigger value="tecnicos" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80 break-words whitespace-normal leading-snug">Personal Técnico</TabsTrigger>
            <TabsTrigger value="administrativos" className="flex-1 min-w-[30%] sm:min-w-0 text-center px-3 py-2 rounded-md transition-colors duration-200 text-sm sm:text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground hover:data-[state=inactive]:bg-muted/80 break-words whitespace-normal leading-snug">Personal Administrativo</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="informe" className="mt-6 space-y-6">
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Staff Técnico Activo</CardTitle><UserCheck className="h-5 w-5 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold font-headline">{totalTechnicians}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Nómina Técnica (Base Mensual)</CardTitle><DollarSignIcon className="h-5 w-5 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold font-headline">{formatCurrency(totalMonthlyTechnicianSalaries)}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Staff Administrativo</CardTitle><UserCheck className="h-5 w-5 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold font-headline">{totalAdministrativeStaff}</div></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Nómina Admin. (Base Mensual)</CardTitle><DollarSignIcon className="h-5 w-5 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold font-headline">{formatCurrency(totalMonthlyAdministrativeSalaries)}</div></CardContent></Card>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight">Análisis de Rendimiento</h2>
                    <p className="text-muted-foreground">Filtre por fecha para ver comisiones potenciales.</p>
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full sm:w-[280px] justify-start text-left font-normal bg-card",!filterDateRange && "text-muted-foreground")}>
                            <CalendarDateIcon className="mr-2 h-4 w-4" />
                            {filterDateRange?.from ? (filterDateRange.to ? (`${format(filterDateRange.from, "LLL dd, y", { locale: es })} - ${format(filterDateRange.to, "LLL dd, y", { locale: es })}`) : format(filterDateRange.from, "LLL dd, y", { locale: es })) : (<span>Seleccione rango</span>)}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar initialFocus mode="range" defaultMonth={filterDateRange?.from} selected={filterDateRange} onSelect={setFilterDateRange} numberOfMonths={2} locale={es} />
                    </PopoverContent>
                </Popover>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Rendimiento Individual</CardTitle>
                    <CardDescription>Sueldo total potencial basado en la ganancia neta del taller en el período seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                    { (unifiedPerformanceData.length > 0) ? (
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                            {unifiedPerformanceData.map(perf => (
                                <Card key={perf.id} className="shadow-sm border">
                                    <CardHeader className="pb-3 pt-4">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-base font-medium">{perf.name}</CardTitle>
                                            <div className="flex gap-1">
                                                {perf.roles.map(role => <Badge key={role} variant={role === 'Técnico' ? 'default' : 'secondary'}>{role}</Badge>)}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-1 text-sm pb-4">
                                        {perf.roles.includes('Técnico') && (
                                            <div className="flex justify-between"><span className="text-muted-foreground">Trabajo ingresado:</span><span className="font-semibold">{formatCurrency(perf.totalRevenue)}</span></div>
                                        )}
                                        <div className="flex justify-between"><span className="text-muted-foreground">Sueldo base:</span><span className="font-semibold">{formatCurrency(perf.baseSalary)}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><BadgeCent className="h-3.5 w-3.5"/>Comisiones {format(filterDateRange?.from ?? new Date(), 'MMMM', {locale: es})}:</span><span className="font-semibold text-blue-600">{formatCurrency(perf.totalCommissionEarned)}</span></div>
                                        <div className="flex justify-between font-bold pt-1 border-t mt-1"><span className="text-muted-foreground">Sueldo total:</span><span className="text-green-600">{formatCurrency(perf.totalEarnings)}</span></div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No hay datos de rendimiento para mostrar en este período.</p>
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="tecnicos" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle>Lista de Staff Técnico</CardTitle>
                        <CardDescription>Visualiza y gestiona al personal técnico.</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button className="w-full sm:w-auto" onClick={() => setIsTechnicianDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Nuevo Técnico</Button>
                      </div>
                  </div>
                   <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
                    <div className="relative flex-1 sm:flex-initial w-full sm:w-auto">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="search" placeholder="Buscar por nombre, área..." className="pl-8 w-full sm:w-[250px] lg:w-[300px] bg-background" value={searchTermTech} onChange={(e) => setSearchTermTech(e.target.value)} />
                    </div>
                    <Button variant="outline" className="w-full sm:w-auto bg-background" onClick={() => setShowArchivedTech(!showArchivedTech)}>
                      {showArchivedTech ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                      {showArchivedTech ? "Ver Activos" : "Ver Archivados"}
                    </Button>
                   </div>
              </CardHeader>
              <CardContent><div className="overflow-x-auto"><TechniciansTable technicians={filteredTechnicians} /></div></CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="administrativos" className="mt-6 space-y-6">
           <Card>
              <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                          <CardTitle>Lista de Staff Administrativo</CardTitle>
                          <CardDescription>Visualiza y gestiona al personal administrativo.</CardDescription>
                      </div>
                       <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button className="w-full sm:w-auto" onClick={() => setIsStaffDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" />Nuevo Staff</Button>
                      </div>
                  </div>
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 w-full">
                    <div className="relative flex-1 sm:flex-initial w-full sm:w-auto">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="search" placeholder="Buscar por nombre, rol..." className="pl-8 w-full sm:w-[250px] lg:w-[300px] bg-background" value={searchTermAdmin} onChange={(e) => setSearchTermAdmin(e.target.value)} />
                    </div>
                    <Button variant="outline" className="w-full sm:w-auto bg-background" onClick={() => setShowArchivedAdmin(!showArchivedAdmin)}>
                      {showArchivedAdmin ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                      {showArchivedAdmin ? "Ver Activos" : "Ver Archivados"}
                    </Button>
                  </div>
              </CardHeader>
              <CardContent><div className="overflow-x-auto"><AdministrativeStaffTable staffList={filteredAdminStaff} /></div></CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      <TechnicianDialog open={isTechnicianDialogOpen} onOpenChange={setIsTechnicianDialogOpen} onSave={handleSaveTechnician} />
      <AdministrativeStaffDialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen} onSave={handleSaveAdminStaff} />
    </>
  );
}
