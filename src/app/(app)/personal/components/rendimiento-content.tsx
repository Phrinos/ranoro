
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { calculateSaleProfit } from '@/lib/placeholder-data';
import type { MonthlyFixedExpense, InventoryItem, SaleReceipt, ServiceRecord, User } from '@/types';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval, isValid, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import { CalendarIcon as CalendarDateIcon, Wallet } from 'lucide-react';
import { cn, formatCurrency } from "@/lib/utils";
import type { DateRange } from 'react-day-picker';
import { operationsService, inventoryService, adminService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
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

export function RendimientoPersonalContent() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allSales, setAllSales] = useState<SaleReceipt[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [allInventory, setAllInventory] = useState<any[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<MonthlyFixedExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  useEffect(() => {
    setIsLoading(true);
    const unsubs: (() => void)[] = [
      adminService.onUsersUpdate(setAllUsers),
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
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    const interval = { start: from, end: to };

    const getAdvisorRelevantDate = (s: ServiceRecord): Date | null => {
      // Prioritize the earliest date as the "creation" or "management" date
      const dates = [
        parseDate(s.quoteDate),
        parseDate(s.receptionDateTime),
        parseDate(s.serviceDate)
      ].filter((d): d is Date => d !== null && isValid(d));
      
      if (dates.length === 0) return null;
      
      return new Date(Math.min(...dates.map(d => d.getTime())));
    };
    
    const advisorServicesInRange = allServices.filter(s => {
      const relevantDate = getAdvisorRelevantDate(s);
      return relevantDate && isValid(relevantDate) && isWithinInterval(relevantDate, interval);
    });

    const completedServicesInRange = allServices.filter(s => {
        const deliveryDate = parseDate(s.deliveryDateTime);
        return s.status === 'Entregado' && deliveryDate && isValid(deliveryDate) && isWithinInterval(deliveryDate, interval);
    });

    const grossProfit = completedServicesInRange.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);
    
    const activeUsers = allUsers.filter(u => !u.isArchived);
    const fixedSalaries = activeUsers.reduce((sum, p) => sum + (p.monthlySalary || 0), 0);
    const otherFixedExpenses = fixedExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalFixedExpenses = fixedSalaries + otherFixedExpenses;

    const netProfitForCommissions = Math.max(0, grossProfit - totalFixedExpenses);
    
    return activeUsers.map(user => {
        const isAdvisor = user.role === 'Asesor' || user.role === 'Admin' || user.role === 'Superadministrador';
        const isTechnician = user.role === 'Tecnico';

        let generatedRevenue = 0;
        
        if (isTechnician) {
            generatedRevenue += completedServicesInRange
                .filter(s => s.technicianId === user.id)
                .reduce((sum, s) => sum + (s.totalCost || 0), 0);
        }

        if (isAdvisor) {
             generatedRevenue += advisorServicesInRange
                .filter(s => s.serviceAdvisorId === user.id)
                .reduce((sum, s) => sum + (s.totalCost || 0), 0);
        }
        
        const commission = netProfitForCommissions * ((user.commissionRate || 0) / 100);
        const totalSalary = (user.monthlySalary || 0) + commission;

        return {
          id: user.id,
          name: user.name,
          role: user.role,
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
                      {person.role && (
                          <div className="flex flex-wrap gap-1 pt-1">
                              <Badge variant={getRoleBadgeVariant(person.role)}>{person.role}</Badge>
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
  );
}
