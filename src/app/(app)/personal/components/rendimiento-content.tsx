
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ServiceRecord, User, InventoryItem } from '@/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, isValid, startOfDay, endOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import { cn, formatCurrency } from "@/lib/utils";
import { serviceService, adminService, inventoryService } from '@/lib/services';
import { Loader2 } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { calcEffectiveProfit } from '@/lib/money-helpers';

interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

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
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  useEffect(() => {
    setIsLoading(true);
    const unsubs: (() => void)[] = [
      adminService.onUsersUpdate(setAllUsers),
      inventoryService.onItemsUpdate(setInventoryItems),
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
      let totalCommission = 0;
      const commissionRate = user.commissionRate || 0;

      for (const service of completedServicesInRange) {
        const serviceTotal = Number(service.totalCost) || 0;
        let userWasInvolvedAsAdvisor = false;
        let userWasInvolvedAsTechnician = false;

        // --- Atribución de Ingresos Generados ---
        // 1. Asesor del servicio
        if (service.serviceAdvisorId === user.id || service.serviceAdvisorName === user.name) {
          generatedRevenue += serviceTotal;
          userWasInvolvedAsAdvisor = true;
        }

        // 2. Técnico del servicio
        if (service.technicianId === user.id || service.technicianName === user.name) {
            generatedRevenue += serviceTotal;
            userWasInvolvedAsTechnician = true;
        }

        // --- Cálculo de Comisiones ---
        if ((userWasInvolvedAsAdvisor || userWasInvolvedAsTechnician) && commissionRate > 0) {
           for (const item of service.serviceItems || []) {
            let userIsResponsibleForItem = false;
            
            // Técnico es responsable de su ítem.
            if ((item as any).technicianId === user.id || (item as any).technicianName === user.name) {
              userIsResponsibleForItem = true;
            } 
            // Asesor es responsable del ítem si no hay técnico asignado a ese ítem.
            else if ((service.serviceAdvisorId === user.id || service.serviceAdvisorName === user.name) && !(item as any).technicianId && !(item as any).technicianName) {
              userIsResponsibleForItem = true;
            }

            if (userIsResponsibleForItem) {
              const itemPrice = Number(item.sellingPrice) || 0;
              const suppliesCost = inventoryService.getSuppliesCostForItem(item, inventoryItems);
              const itemProfit = itemPrice - suppliesCost;
              if (itemProfit > 0) {
                totalCommission += itemProfit * (commissionRate / 100);
              }
            }
          }
        }
      }

      const baseSalary = user.monthlySalary || 0;
      const totalSalary = baseSalary + totalCommission;

      return {
        id: user.id,
        name: user.name,
        role: user.role,
        baseSalary,
        generatedRevenue,
        commission: totalCommission,
        totalSalary
      };
    })
    .sort((a,b) => b.totalSalary - a.totalSalary);
  }, [dateRange, allUsers, allServices, inventoryItems]);

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
