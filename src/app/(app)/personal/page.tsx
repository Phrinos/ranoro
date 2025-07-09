
"use client";

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { PlusCircle, ListFilter, TrendingUp, DollarSign as DollarSignIcon, CalendarIcon as CalendarDateIcon, BadgeCent, Users, Search, Archive, UserCheck, UserX } from "lucide-react";
import { TechniciansTable } from "../tecnicos/components/technicians-table";
import { AdministrativeStaffTable } from "../administrativos/components/administrative-staff-table";
import { TechnicianDialog } from "../tecnicos/components/technician-dialog";
import { AdministrativeStaffDialog } from "../administrativos/components/administrative-staff-dialog";
import { placeholderTechnicians, placeholderAdministrativeStaff, placeholderServiceRecords, persistToFirestore, IVA_RATE, hydrateReady } from "@/lib/placeholder-data";
import type { Technician, ServiceRecord, AdministrativeStaff } from "@/types";
import type { TechnicianFormValues } from "../tecnicos/components/technician-form";
import type { AdministrativeStaffFormValues } from "../administrativos/components/administrative-staff-form";
import { parseISO, isWithinInterval, format, isValid, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from "react-day-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Separator } from '@/components/ui/separator';


interface AggregatedTechnicianPerformance {
  technicianId: string;
  technicianName: string;
  totalRevenue: number;
  totalProfit: number;
  totalCommissionEarned: number; 
}
interface AggregatedAdminStaffPerformance {
  staffId: string;
  staffName: string;
  baseSalary: number;
  commissionEarned: number;
  totalEarnings: number;
}


function PersonalPageComponent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'informe';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [version, setVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [adminStaff, setAdminStaff] = useState<AdministrativeStaff[]>([]);
  
  const [searchTermTech, setSearchTermTech] = useState('');
  const [showArchivedTech, setShowArchivedTech] = useState(false);
  
  const [searchTermAdmin, setSearchTermAdmin] = useState('');
  const [showArchivedAdmin, setShowArchivedAdmin] = useState(false);

  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined);
  
  useEffect(() => {
    hydrateReady.then(() => {
        setHydrated(true);
        setTechnicians([...placeholderTechnicians]);
        setAdminStaff([...placeholderAdministrativeStaff]);
        const now = new Date();
        setFilterDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    });
    const forceUpdate = () => setVersion(v => v + 1);
    window.addEventListener('databaseUpdated', forceUpdate);
    return () => window.removeEventListener('databaseUpdated', forceUpdate);
  }, []);
  
  useEffect(() => {
    if (hydrated) {
        setTechnicians([...placeholderTechnicians]);
        setAdminStaff([...placeholderAdministrativeStaff]);
    }
  }, [version, hydrated]);
  
  const handleSaveTechnician = async (data: TechnicianFormValues) => {
    const newTechnician: Technician = {
      id: `T_${Date.now().toString(36)}`, 
      ...data,
      hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
      monthlySalary: Number(data.monthlySalary) || undefined,
      commissionRate: data.commissionRate ? Number(data.commissionRate) : undefined,
      standardHoursPerDay: data.standardHoursPerDay ? Number(data.standardHoursPerDay) : 8,
      isArchived: false,
    };
    placeholderTechnicians.push(newTechnician);
    await persistToFirestore(['technicians']);
    toast({ title: "Técnico Creado" });
  };
  
  const handleSaveAdminStaff = async (data: AdministrativeStaffFormValues) => {
    const newStaffMember: AdministrativeStaff = {
      id: `ADM_${Date.now().toString(36)}`, 
      ...data,
      hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
      monthlySalary: Number(data.monthlySalary) || undefined,
      commissionRate: data.commissionRate ? Number(data.commissionRate) : undefined,
      isArchived: false,
    };
    placeholderAdministrativeStaff.push(newStaffMember);
    await persistToFirestore(['administrativeStaff']);
    toast({ title: "Staff Administrativo Creado" });
  };
  
  const {
      totalTechnicians, totalMonthlyTechnicianSalaries, aggregatedTechnicianPerformance,
      totalAdministrativeStaff, totalMonthlyAdministrativeSalaries, aggregatedAdminPerformance
  } = useMemo(() => {
    if (!hydrated || !filterDateRange?.from) return { totalTechnicians: 0, totalMonthlyTechnicianSalaries: 0, aggregatedTechnicianPerformance: [], totalAdministrativeStaff: 0, totalMonthlyAdministrativeSalaries: 0, aggregatedAdminPerformance: [] };

    const dateFrom = startOfDay(filterDateRange.from);
    const dateTo = filterDateRange.to ? endOfDay(filterDateRange.to) : endOfDay(filterDateRange.from);

    const activeTechnicians = technicians.filter(t => !t.isArchived);
    const totalTechs = activeTechnicians.length;
    const totalTechSalaries = activeTechnicians.reduce((sum, tech) => sum + (tech.monthlySalary || 0), 0);
    const aggTechPerformance: AggregatedTechnicianPerformance[] = activeTechnicians.map(tech => {
      const techServices = placeholderServiceRecords.filter(s => s.technicianId === tech.id && s.status === 'Completado' && isWithinInterval(parseISO(s.deliveryDateTime || s.serviceDate), { start: dateFrom, end: dateTo }));
      const totalRevenue = techServices.reduce((sum, s) => sum + s.totalCost, 0);
      const totalProfit = techServices.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
      const totalCommissionEarned = totalProfit * (tech.commissionRate || 0);
      return { technicianId: tech.id, technicianName: tech.name, totalRevenue, totalProfit, totalCommissionEarned };
    });

    const activeAdminStaff = adminStaff.filter(s => !s.isArchived);
    const totalAdmins = activeAdminStaff.length;
    const totalAdminSalaries = activeAdminStaff.reduce((sum, staff) => sum + (staff.monthlySalary || 0), 0);
    const completedServicesInRange = placeholderServiceRecords.filter(s => s.status === 'Completado' && s.deliveryDateTime && isWithinInterval(parseISO(s.deliveryDateTime), { start: dateFrom, end: dateTo }));
    const totalProfitFromCompletedServicesInRange = completedServicesInRange.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
    const aggAdminPerformance: AggregatedAdminStaffPerformance[] = activeAdminStaff.map(staff => {
      const commissionEarned = totalProfitFromCompletedServicesInRange * (staff.commissionRate || 0);
      const baseSalary = staff.monthlySalary || 0;
      return { staffId: staff.id, staffName: staff.name, baseSalary, commissionEarned, totalEarnings: baseSalary + commissionEarned };
    });
    
    return {
        totalTechnicians: totalTechs, totalMonthlyTechnicianSalaries: totalTechSalaries, aggregatedTechnicianPerformance: aggTechPerformance,
        totalAdministrativeStaff: totalAdmins, totalMonthlyAdministrativeSalaries: totalAdminSalaries, aggregatedAdminPerformance: aggAdminPerformance
    };
  }, [technicians, adminStaff, filterDateRange, hydrated, version]);

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

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (!hydrated) { return <div className="text-center py-10">Cargando...</div>; }
  
  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Personal</h1>
          <p className="text-primary-foreground/80 mt-1">Administra la información, roles y rendimiento de todo tu personal.</p>
      </div>

       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="informe" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Informe</TabsTrigger>
          <TabsTrigger value="tecnicos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Personal Técnico</TabsTrigger>
          <TabsTrigger value="administrativos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Personal Administrativo</TabsTrigger>
        </TabsList>

        <TabsContent value="informe" className="space-y-6">
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
                    <CardDescription>Comisiones potenciales basadas en la ganancia generada en el período seleccionado.</CardDescription>
                </CardHeader>
                <CardContent>
                    { (aggregatedTechnicianPerformance.length > 0 || aggregatedAdminPerformance.length > 0) ? (
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                            {aggregatedTechnicianPerformance.map(techPerf => (
                                <Card key={techPerf.technicianId} className="shadow-sm border">
                                    <CardHeader className="pb-3 pt-4">
                                        <CardDescription className="text-xs font-semibold text-blue-600">Técnico</CardDescription>
                                        <CardTitle className="text-base font-medium">{techPerf.technicianName}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-1 text-sm pb-4">
                                        <div className="flex justify-between"><span className="text-muted-foreground">Ingresos Totales:</span><span className="font-semibold">{formatCurrency(techPerf.totalRevenue)}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Ganancia Total:</span><span className="font-semibold text-green-600">{formatCurrency(techPerf.totalProfit)}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><BadgeCent className="h-3.5 w-3.5"/>Comisión Potencial:</span><span className="font-semibold text-blue-600">{formatCurrency(techPerf.totalCommissionEarned)}</span></div>
                                    </CardContent>
                                </Card>
                            ))}
                            {aggregatedAdminPerformance.map(staffPerf => (
                                <Card key={staffPerf.staffId} className="shadow-sm border">
                                    <CardHeader className="pb-3 pt-4">
                                        <CardDescription className="text-xs font-semibold text-purple-600">Administrativo</CardDescription>
                                        <CardTitle className="text-base font-medium">{staffPerf.staffName}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-1 text-sm pb-4">
                                        <div className="flex justify-between"><span className="text-muted-foreground">Salario Base:</span><span className="font-semibold">{formatCurrency(staffPerf.baseSalary)}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-muted-foreground flex items-center gap-1"><BadgeCent className="h-3.5 w-3.5"/>Comisión Potencial:</span><span className="font-semibold text-blue-600">{formatCurrency(staffPerf.commissionEarned)}</span></div>
                                        <div className="flex justify-between font-bold pt-1 border-t mt-1"><span className="text-muted-foreground">Total (Potencial):</span><span className="text-green-600">{formatCurrency(staffPerf.totalEarnings)}</span></div>
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

        <TabsContent value="tecnicos" className="space-y-6">
            <Card>
              <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle>Lista de Staff Técnico</CardTitle>
                        <CardDescription>Visualiza y gestiona al personal técnico.</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <TechnicianDialog trigger={<Button className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" />Nuevo Técnico</Button>} onSave={handleSaveTechnician}/>
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
        <TabsContent value="administrativos" className="space-y-6">
           <Card>
              <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                          <CardTitle>Lista de Staff Administrativo</CardTitle>
                          <CardDescription>Visualiza y gestiona al personal administrativo.</CardDescription>
                      </div>
                       <div className="flex items-center gap-2 w-full sm:w-auto">
                        <AdministrativeStaffDialog trigger={<Button className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" />Nuevo Staff</Button>} onSave={handleSaveAdminStaff}/>
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
    </>
  );
}

export default function PersonalPageWrapper() {
    return (<Suspense fallback={<div>Cargando...</div>}><PersonalPageComponent /></Suspense>)
}

    
