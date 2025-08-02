

"use client";

import { useState, useMemo, useEffect, useCallback, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, UserCheck, UserX, Search, TrendingUp, Users, ChevronsRight, ListFilter, DollarSign } from "lucide-react";
import { UserDialog } from '../../administracion/components/user-dialog';
import type { User, ServiceRecord, SaleReceipt, MonthlyFixedExpense, AppRole, Area } from '@/types';
import type { UserFormValues } from '../../administracion/components/user-form';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, getPaymentMethodVariant } from "@/lib/utils";
import { Loader2, CalendarIcon as CalendarDateIcon, BadgeCent, Edit, User as UserIcon, TrendingDown, AlertCircle, ArrowUpCircle, ArrowDownCircle, Coins, BarChart2, Wallet, Wrench, Landmark, LayoutGrid, CalendarDays, FileText, Receipt, Package, Truck, Settings, Shield, LineChart, Printer, Copy, MessageSquare, ChevronRight, Share2 } from 'lucide-react';
import Link from 'next/link';
import type { DateRange } from 'react-day-picker';
import { adminService, operationsService, inventoryService } from '@/lib/services';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, isSameDay, startOfMonth, endOfMonth, subMonths, isWithinInterval, isValid, compareDesc } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { calculateSaleProfit, AUTH_USER_LOCALSTORAGE_KEY } from '@/lib/placeholder-data';
import { parseDate } from '@/lib/forms';
import { Badge } from "@/components/ui/badge";

const getRoleBadgeVariant = (role: string): "white" | "lightGray" | "outline" | "black" => {
    const lowerCaseRole = role.toLowerCase();
    if (lowerCaseRole === 'asesor') {
        return 'white';
    }
    if (lowerCaseRole.includes('tecnico') || lowerCaseRole.includes('técnico')) {
        return 'lightGray';
    }
    return 'outline';
};

export function PersonalPageComponent({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { toast } = useToast();
  const defaultTab = searchParams?.tab as string || 'resumen';
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allInventory, setAllInventory] = useState<any[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<MonthlyFixedExpense[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  useEffect(() => {
    setIsLoading(true);
    const unsubs: (() => void)[] = [
      adminService.onUsersUpdate(setAllUsers),
      adminService.onRolesUpdate(setRoles),
      operationsService.onSalesUpdate(setAllSales),
      operationsService.onServicesUpdate(setAllServices),
      inventoryService.onItemsUpdate(setAllInventory),
      inventoryService.onFixedExpensesUpdate((expenses) => {
          setFixedExpenses(expenses);
          setIsLoading(false);
      })
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const performanceData = useMemo(() => {
    if (!dateRange?.from) return [];
    
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
    const interval = { start: from, end: to };

    const getAdvisorRelevantDate = (s: ServiceRecord): Date | null => {
        return parseDate(s.quoteDate) || parseDate(s.receptionDateTime) || parseDate(s.serviceDate);
    };

    const getTechnicianRelevantDate = (s: ServiceRecord): Date | null => {
        return parseDate(s.deliveryDateTime);
    };

    const completedServicesInRange = allServices.filter(s => {
        const deliveryDate = parseDate(s.deliveryDateTime);
        return s.status === 'Entregado' && deliveryDate && isValid(deliveryDate) && isWithinInterval(deliveryDate, interval);
    });

    const salesInRange = allSales.filter(s => 
        s.status !== 'Cancelado' && 
        isValid(parseDate(s.saleDate)!) && 
        isWithinInterval(parseDate(s.saleDate)!, interval)
    );
    
    const grossProfit = salesInRange.reduce((sum, s) => sum + calculateSaleProfit(s, allInventory), 0) + 
                        completedServicesInRange.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
    
    const activeUsers = allUsers;
    const fixedSalaries = activeUsers.reduce((sum, p) => sum + (p.monthlySalary || 0), 0);
    const otherFixedExpenses = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalFixedExpenses = fixedSalaries + otherFixedExpenses;

    const netProfitForCommissions = Math.max(0, grossProfit - totalFixedExpenses);
    
    return activeUsers.map(user => {
        const userRoles = new Set((user.role ? [user.role] : []).map(r => r.toLowerCase()));
        
        let generatedRevenue = 0;

        if (userRoles.has('técnico') || userRoles.has('tecnico')) {
            generatedRevenue += completedServicesInRange
                .filter(s => s.technicianId === user.id)
                .reduce((sum, s) => sum + (s.totalCost || 0), 0);
        }

        if (userRoles.has('asesor') || userRoles.has('admin') || userRoles.has('superadministrador')) {
             const advisorServices = allServices
                .filter(s => {
                    const relevantDate = getAdvisorRelevantDate(s);
                    return s.serviceAdvisorId === user.id && relevantDate && isValid(relevantDate) && isWithinInterval(relevantDate, interval);
                });
             generatedRevenue += advisorServices.reduce((sum, s) => sum + (s.totalCost || 0), 0);
        }
        
        const commission = netProfitForCommissions * (user.commissionRate || 0);
        const totalSalary = (user.monthlySalary || 0) + commission;

        return {
          id: user.id,
          name: user.name,
          roles: [user.role],
          baseSalary: user.monthlySalary || 0,
          generatedRevenue,
          commission,
          totalSalary
        };
      })
      .sort((a,b) => b.totalSalary - a.totalSalary);
  }, [dateRange, allUsers, allSales, allServices, allInventory, fixedExpenses]);

  if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }
  
  return (
    <>
      <div className="bg-primary text-primary-foreground rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Rendimiento del Personal</h1>
          <p className="text-primary-foreground/80 mt-1">Analiza los ingresos, comisiones y salarios de tu equipo.</p>
      </div>
      
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
                          <CardTitle className="text-lg">{person.name}</CardTitle>
                          {person.roles.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                  {person.roles.map(role => <Badge key={role} variant={getRoleBadgeVariant(role)}>{role}</Badge>)}
                              </div>
                          )}
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                          <div className="flex justify-between items-center"><span className="text-muted-foreground">Trabajo ingresado:</span><span className="font-semibold">{formatCurrency(person.generatedRevenue)}</span></div>
                          <div className="flex justify-between items-center"><span className="text-muted-foreground">Sueldo base:</span><span className="font-semibold">{formatCurrency(person.baseSalary)}</span></div>
                          <div className="flex justify-between items-center"><span className="text-muted-foreground">Comisiones {dateRange?.from ? format(dateRange.from, 'MMM', { locale: es }) : ''}:</span><span className="font-semibold text-green-600">{formatCurrency(person.commission)}</span></div>
                          <div className="flex justify-between items-center border-t pt-2 mt-2 font-bold"><span className="text-foreground">Sueldo total:</span><span className="text-lg">{formatCurrency(person.totalSalary)}</span></div>
                      </CardContent>
                  </Card>
              ))}
          </CardContent>
      </Card>
    </>
  );
}
