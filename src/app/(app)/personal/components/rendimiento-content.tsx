
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { ServiceRecord, User } from '@/types';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval, isValid, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import { CalendarIcon as CalendarDateIcon } from 'lucide-react';
import { cn, formatCurrency } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { serviceService, adminService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { Badge } from "@/components/ui/badge";

const getRoleBadgeVariant = (role: string): "white" | "lightGray" | "outline" | "black" => {
    const lowerCaseRole = role.toLowerCase();
    if (lowerCaseRole.includes('asesor')) {
        return 'white';
    }
    if (lowerCaseRole.includes('tecnico') || lowerCaseRole.includes('técnico')) {
        return 'lightGray';
    }
    return 'outline';
};

export function RendimientoPersonalContent() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  useEffect(() => {
    setIsLoading(true);
    const unsubs: (() => void)[] = [
      adminService.onUsersUpdate(setAllUsers),
      // Suscripción a servicios y marcamos la carga como finalizada aquí
      serviceService.onServicesUpdate((services) => {
        setAllServices(services);
        setIsLoading(false);
      })
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);
  
  const performanceData = useMemo(() => {
    if (!dateRange?.from || allUsers.length === 0) return [];
    
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
    const interval = { start: from, end: to };

    // 1. Filtrar solo los servicios completados dentro del rango de fechas
    const completedServicesInRange = allServices.filter(s => {
        const deliveryDate = parseDate(s.deliveryDateTime);
        return s.status === 'Entregado' && deliveryDate && isValid(deliveryDate) && isWithinInterval(deliveryDate, interval);
    });

    const activeUsers = allUsers.filter(u => !u.isArchived);
    
    // 2. Calcular rendimiento para cada usuario
    return activeUsers.map(user => {
        let generatedRevenue = 0;
        let commission = 0;

        // Iterar sobre los servicios completados
        for (const service of completedServicesInRange) {
            // Iterar sobre los items de cada servicio (mano de obra y refacciones)
            for (const item of service.serviceItems || []) {
                // Si el item fue asignado a este técnico
                if (item.technicianId === user.id) {
                    // Sumar el precio de venta al trabajo ingresado por el técnico
                    generatedRevenue += item.sellingPrice || 0;
                    // Sumar la comisión pre-calculada y guardada en el item
                    commission += item.technicianCommission || 0;
                }
            }
        }
        
        const baseSalary = user.monthlySalary || 0;
        const totalSalary = baseSalary + commission;

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          baseSalary,
          generatedRevenue,
          commission,
          totalSalary
        };
      })
      .sort((a,b) => b.totalSalary - a.totalSalary);
  }, [dateRange, allUsers, allServices]);

  if (isLoading) { return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>; }
  
  return (
    <Card>
      <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                  <CardTitle>Rendimiento Individual</CardTitle>
                  <CardDescription>Resumen de ingresos, comisiones y sueldos del personal.</CardDescription>
              </div>
              <Popover>
                <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full sm:w-[280px] justify-start text-left font-normal bg-card", !dateRange && "text-muted-foreground")}><CalendarDateIcon className="mr-2 h-4 w-4" />{dateRange?.from ? (dateRange.to && !isSameDay(dateRange.from, dateRange.to) ? `${format(dateRange.from, "LLL dd, y", { locale: es })} - ${format(dateRange.to, "LLL dd, y", { locale: es })}` : format(dateRange.from, "MMMM yyyy", { locale: es })) : (<span>Seleccione rango</span>)}</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end"><Calendar mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} locale={es} /></PopoverContent>
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
