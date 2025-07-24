

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, UserCheck, UserX, Search, TrendingUp, Users } from "lucide-react";
import { PersonnelTable } from "./personnel-table";
import { PersonnelDialog } from "./personnel-dialog";
import type { User, Technician, ServiceRecord, AdministrativeStaff, SaleReceipt, MonthlyFixedExpense, Personnel, AppRole } from '@/types';
import type { PersonnelFormValues } from "./personnel-form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { Loader2, DollarSign as DollarSignIcon, CalendarIcon as CalendarDateIcon, BadgeCent, Edit, User as UserIcon, TrendingDown, DollarSign, AlertCircle, ArrowUpCircle, ArrowDownCircle, Coins, BarChart2, Wallet, Wrench, Landmark, LayoutGrid, CalendarDays, FileText, Receipt, Package, Truck, Settings, Shield, LineChart, Printer, Copy, MessageSquare, ChevronRight, ListFilter, Badge } from 'lucide-react';
import Link from 'next/link';
import type { DateRange } from 'react-day-picker';
import { personnelService, operationsService, inventoryService, adminService } from '@/lib/services';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, isSameDay, startOfMonth, endOfMonth, subMonths, isWithinInterval, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { calculateSaleProfit } from '@/lib/placeholder-data';
import { parseDate } from '@/lib/forms';


export function PersonalPageComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { toast } = useToast();
  const defaultTab = searchParams?.tab as string || 'resumen';
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [allPersonnel, setAllPersonnel] = useState<Personnel[]>([]);
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allInventory, setAllInventory] = useState<InventoryItem[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<MonthlyFixedExpense[]>([]);
  const [appRoles, setAppRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  const [isPersonnelDialogOpen, setIsPersonnelDialogOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  useEffect(() => {
    setIsLoading(true);
    const unsubs: (() => void)[] = [
      personnelService.onPersonnelUpdate((data) => {
        setAllPersonnel(data);
      }),
      operationsService.onSalesUpdate(setAllSales),
      operationsService.onServicesUpdate(setAllServices),
      inventoryService.onItemsUpdate(setAllInventory),
      inventoryService.onFixedExpensesUpdate(setFixedExpenses),
      adminService.onRolesUpdate((roles) => {
          setAppRoles(roles);
          setIsLoading(false);
      })
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const handleOpenDialog = (personnel?: Personnel | null) => {
    setEditingPersonnel(personnel || null);
    setIsPersonnelDialogOpen(true);
  };
  
  const handleSavePersonnel = async (data: PersonnelFormValues, id?: string) => {
    try {
      await personnelService.savePersonnel(data, id);
      toast({ title: `Personal ${id ? 'actualizado' : 'creado'} con éxito.` });
      setIsPersonnelDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };
  
  const handleArchivePersonnel = async (personnel: Personnel) => {
    try {
        await personnelService.archivePersonnel(personnel.id, !personnel.isArchived);
        toast({ title: `Personal ${!personnel.isArchived ? 'archivado' : 'restaurado'}.` });
    } catch(e) {
        toast({title: "Error al archivar", variant: "destructive"});
    }
  };

  const performanceData = useMemo(() => {
    if (!dateRange?.from) return [];
    
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    const interval = { start: from, end: to };

    const salesInRange = allSales.filter(s => s.status !== 'Cancelado' && isWithinInterval(parseDate(s.saleDate)!, interval));
    const servicesInRange = allServices.filter(s => s.status === 'Entregado' && isWithinInterval(parseDate(s.deliveryDateTime)!, interval));

    const grossProfit = salesInRange.reduce((sum, s) => sum + calculateSaleProfit(s, allInventory), 0) + servicesInRange.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
    const fixedSalaries = allPersonnel.filter(p => !p.isArchived).reduce((sum, p) => sum + (p.monthlySalary || 0), 0);
    const otherFixedExpenses = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = grossProfit - fixedSalaries - otherFixedExpenses;

    const isProfitable = netProfit > 0;

    return allPersonnel
      .filter(p => !p.isArchived)
      .map(person => {
        const generatedRevenue = servicesInRange.filter(s => s.technicianId === person.id).reduce((sum, s) => sum + (s.totalCost || 0), 0);
        const commission = isProfitable ? netProfit * (person.commissionRate || 0) : 0;
        const totalSalary = (person.monthlySalary || 0) + commission;

        return {
          id: person.id,
          name: person.name,
          roles: person.roles,
          baseSalary: person.monthlySalary || 0,
          generatedRevenue,
          commission,
          totalSalary
        };
      })
      .sort((a,b) => b.totalSalary - a.totalSalary);
  }, [dateRange, allPersonnel, allSales, allServices, allInventory, fixedExpenses]);

  const filteredPersonnel = useMemo(() => {
    let items = allPersonnel.filter(p => showArchived ? !!p.isArchived : !p.isArchived);
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      items = items.filter(p => 
          p.name.toLowerCase().includes(lowerSearch) || 
          p.roles.some(r => r.toLowerCase().includes(lowerSearch))
      );
    }
    return items.sort((a,b) => a.name.localeCompare(b.name));
  }, [allPersonnel, showArchived, searchTerm]);

  if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }
  
  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Personal</h1>
          <p className="text-primary-foreground/80 mt-1">Administra la información, roles y rendimiento de todo tu personal.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="resumen">Resumen de Rendimiento</TabsTrigger>
          <TabsTrigger value="personal">Lista de Personal</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen" className="mt-6 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>Rendimiento Individual</CardTitle>
                            <CardDescription>Resumen de ingresos, ganancias y comisiones del personal en el mes.</CardDescription>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full sm:w-[280px] justify-start text-left font-normal bg-card", !dateRange && "text-muted-foreground")}><CalendarDateIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to && !isSameDay(dateRange.from, dateRange.to) ? `${format(dateRange.from, "LLL dd, y", { locale: es })} - ${format(dateRange.to, "LLL dd, y", { locale: es })}` : format(dateRange.from, "MMMM yyyy", { locale: es })) : (<span>Seleccione rango</span>)}</Button></PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end"><Calendar mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} /></PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {performanceData.map(person => (
                        <Card key={person.id} className="shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex justify-between items-start">
                                  <span>{person.name}</span>
                                  <div className="flex flex-wrap gap-1 justify-end">{person.roles.map(r => <Badge key={r} variant="secondary">{r}</Badge>)}</div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between items-center"><span className="text-muted-foreground">Trabajo Ingresado:</span><span className="font-semibold">{formatCurrency(person.generatedRevenue)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-muted-foreground">Sueldo Base:</span><span className="font-semibold">{formatCurrency(person.baseSalary)}</span></div>
                                <div className="flex justify-between items-center"><span className="text-muted-foreground">Comisiones {format(dateRange!.from!, 'MMM', { locale: es })}:</span><span className="font-semibold text-green-600">{formatCurrency(person.commission)}</span></div>
                                <div className="flex justify-between items-center border-t pt-2 mt-2 font-bold"><span className="text-foreground">Sueldo Total:</span><span className="text-lg">{formatCurrency(person.totalSalary)}</span></div>
                            </CardContent>
                        </Card>
                    ))}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="personal" className="mt-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Lista de Personal</h2>
                  <p className="text-muted-foreground">Gestiona los perfiles de todo el personal del taller.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}><PlusCircle className="mr-2 h-4 w-4" />Nuevo Personal</Button>
            </div>
            <div className="flex items-center gap-2 mt-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="Buscar por nombre o rol..." className="w-full pl-8 bg-card" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Button variant="outline" className="bg-card" onClick={() => setShowArchived(!showArchived)}>
                    {showArchived ? <UserCheck className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
                    {showArchived ? "Ver Activos" : "Ver Archivados"}
                </Button>
            </div>
            <Card className="mt-4"><CardContent className="p-0"><PersonnelTable personnel={filteredPersonnel} onEdit={handleOpenDialog} onArchive={handleArchivePersonnel} /></CardContent></Card>
        </TabsContent>
      </Tabs>
      
      <PersonnelDialog
        open={isPersonnelDialogOpen}
        onOpenChange={setIsPersonnelDialogOpen}
        personnel={editingPersonnel}
        onSave={handleSavePersonnel}
        appRoles={appRoles.filter(r => r.name !== 'Superadministrador')}
      />
    </>
  );
}
