
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ServiceRecord, User, InventoryItem } from '@/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, isValid, startOfDay, endOfDay } from "date-fns";
import { es } from 'date-fns/locale';
import { cn, formatCurrency, capitalizeWords } from "@/lib/utils";
import { serviceService, adminService, inventoryService } from '@/lib/services';
import { Loader2, User as UserIcon, Wrench, DollarSign } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { Badge } from "@/components/ui/badge";
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';

interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

const getRoleBadgeVariant = (role: string): "white" | "lightGray" | "outline" | "black" => {
  const lowerCaseRole = role.toLowerCase();
  if (lowerCaseRole.includes('asesor')) return 'white';
  if (lowerCaseRole.includes('tecnico') || lowerCaseRole.includes('técnico')) return 'lightGray';
  return 'outline';
};

// ----- Helpers -----
const normalizeText = (s?: string) =>
  (s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // quita acentos

const equalsRelaxed = (a?: string, b?: string) =>
  normalizeText(a) === normalizeText(b);

const matchByIdOrName = (
  user: User,
  id?: string | null,
  name?: string | null
) => {
  if (!user) return false;
  if (id && user.id && id === user.id) return true;
  if (name && user.name && equalsRelaxed(name, user.name)) return true;
  return false;
};

/** Fecha de referencia del servicio:
 * 1) deliveryDateTime; 2) serviceDate
 */
const getServiceReferenceDate = (s: any): Date | undefined => {
  const candidates = [
    s?.deliveryDateTime,
    s?.serviceDate,
  ];
  for (const c of candidates) {
    const d = parseDate(c);
    if (d && isValid(d)) return d;
  }
  return undefined;
};

export function RendimientoPersonalContent() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allServices, setAllServices] = useState<ServiceRecord[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]); // si no lo usas, puedes borrar esto
  const [isLoading, setIsLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });

  useEffect(() => {
    setIsLoading(true);
    const unsubs: (() => void)[] = [
      adminService.onUsersUpdate(setAllUsers),
      inventoryService.onItemsUpdate(setInventoryItems), // opcional
      serviceService.onServicesUpdate((services) => {
        setAllServices(services);
        setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const performanceData = useMemo(() => {
    if (!dateRange?.from || allUsers.length === 0) return [];

    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
    const interval = { start: from, end: to };

    // Filtra solo servicios entregados y dentro del rango por fecha de referencia
    const completedServicesInRange = allServices.filter((s: any) => {
      if (s?.status !== 'Entregado') return false;
      const refDate = getServiceReferenceDate(s);
      return refDate && isWithinInterval(refDate, interval);
    });

    const activeUsers = allUsers.filter((u) => !u.isArchived);

    return activeUsers
      .map((user) => {
        const commissionRate = user.commissionRate || 0;
        
        let generatedRevenueByAdvisor = 0;
        let generatedRevenueByTechnician = 0;
        
        // Calcular ingresos como asesor
        for (const service of completedServicesInRange) {
            const isAdvisor = matchByIdOrName(user, (service as any).serviceAdvisorId, (service as any).serviceAdvisorName);
            if(isAdvisor) {
                generatedRevenueByAdvisor += Number((service as any).totalCost) || 0;
            }
        }
        
        // Calcular ingresos como técnico
        for (const service of completedServicesInRange) {
            const isTechnician = matchByIdOrName(user, (service as any).technicianId, (service as any).technicianName);
            if (isTechnician) {
                generatedRevenueByTechnician += Number((service as any).totalCost) || 0;
            }
        }
        
        // Para el rol de "Asesor y Técnico", sumamos ambos ingresos. Para otros, tomamos el que corresponda.
        const userFunctions = user.functions || [];
        const isBoth = userFunctions.includes('asesor') && userFunctions.includes('tecnico');
        
        let totalGeneratedRevenue;
        if (isBoth) {
            totalGeneratedRevenue = generatedRevenueByAdvisor + generatedRevenueByTechnician;
        } else if (userFunctions.includes('asesor')) {
            totalGeneratedRevenue = generatedRevenueByAdvisor;
        } else if (userFunctions.includes('tecnico')) {
            totalGeneratedRevenue = generatedRevenueByTechnician;
        } else {
             totalGeneratedRevenue = generatedRevenueByAdvisor;
        }


        const totalCommission =
          commissionRate > 0 ? (totalGeneratedRevenue * commissionRate) / 100 : 0;

        const baseSalary = user.monthlySalary || 0;
        const totalSalary = baseSalary + totalCommission;

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          baseSalary,
          generatedRevenue: totalGeneratedRevenue,
          commission: totalCommission,
          totalSalary,
        };
      })
      .sort((a, b) => b.totalSalary - a.totalSalary);
  }, [dateRange, allUsers, allServices, inventoryItems]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Rendimiento Individual</CardTitle>
            <CardDescription>
              Resumen de ingresos, comisiones y sueldos del personal.
            </CardDescription>
          </div>
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {performanceData.map((person) => (
          <Card key={person.id} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{person.name}</CardTitle>
              {person.role && (
                <div className="flex flex-wrap gap-1 pt-1">
                  <Badge variant={getRoleBadgeVariant(person.role)}>
                    {person.role}
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Trabajo ingresado:</span>
                <span className="font-semibold">
                  {formatCurrency(person.generatedRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Sueldo base:</span>
                <span className="font-semibold">
                  {formatCurrency(person.baseSalary)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  Comisiones {dateRange?.from ? format(dateRange.from, 'MMM', { locale: es }) : ''}:
                </span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(person.commission)}
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-2 mt-2 font-bold">
                <span className="text-foreground">Sueldo total:</span>
                <span className="text-lg">{formatCurrency(person.totalSalary)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
