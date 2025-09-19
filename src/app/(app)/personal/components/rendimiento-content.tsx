
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ServiceRecord, User } from '@/types';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval, isValid, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import { cn, formatCurrency } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { serviceService, adminService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';

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

    const completedServicesInRange = allServices.filter(s => {
        const deliveryDate = parseDate(s.deliveryDateTime);
        return s.status === 'Entregado' && deliveryDate && isValid(deliveryDate) && isWithinInterval(deliveryDate, interval);
    });

    const activeUsers = allUsers.filter(u => !u.isArchived);
    
    return activeUsers.map(user => {
        let generatedRevenue = 0;
        let commission = 0;

        for (const service of completedServicesInRange) {
            
            // 1. Sumar comisión como ASESOR (si fue guardada)
            if (service.serviceAdvisorId === user.id) {
                generatedRevenue += service.total || 0;
                commission += service.serviceAdvisorCommission || 0;
            }

            // 2. Sumar comisión como TÉCNICO (si fue guardada)
            for (const item of service.serviceItems || []) {
                if (item.technicianId === user.id) {
                    generatedRevenue += item.sellingPrice || 0;
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
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
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
