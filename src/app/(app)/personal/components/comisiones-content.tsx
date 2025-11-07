
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ServiceRecord, User } from '@/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, isValid, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { cn, formatCurrency, capitalizeWords } from "@/lib/utils";
import { Loader2, User as UserIcon, Wrench, DollarSign } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { Badge } from "@/components/ui/badge";

// Helpers
const toNumber = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v) : (Number(v) as number);
  return Number.isFinite(n) ? n : 0;
};

const getServiceDate = (s: ServiceRecord) => {
  // Usa la mejor fecha disponible: entrega > completado > creado > ISO genérico
  return (
    parseDate((s as any).deliveryDateTime) ||
    parseDate((s as any).completedAt) ||
    parseDate((s as any).createdAt) ||
    (typeof (s as any).date === 'string' ? parseISO((s as any).date) : undefined)
  );
};

const getServiceTotal = (s: ServiceRecord) => {
  // Asegura compatibilidad si alguna vez guardaste con otra clave
  return toNumber((s as any).total ?? (s as any).totalCost ?? (s as any).grandTotal);
};

// Filtro por estado: cuenta solo los servicios del mes entregados.
const shouldCount = (s: ServiceRecord) => s.status === 'Entregado';


interface ComisionesContentProps {
  allServices: ServiceRecord[];
  allUsers: User[];
}

const generateMonthOptions = () => {
    const options: { value: string, label: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const value = format(date, 'yyyy-MM');
        const label = capitalizeWords(format(date, 'MMMM yyyy', { locale: es }));
        options.push({ value, label });
    }
    return options;
};

export default function ComisionesContent({ allServices, allUsers }: ComisionesContentProps) {
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0]?.value || '');

  const { advisorPerformance, technicianPerformance } = useMemo(() => {
    if (!selectedMonth) return { advisorPerformance: [], technicianPerformance: [] };

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(startDate);
    const interval = { start: startDate, end: endDate };

    const userNameById = new Map<string, string>(
      allUsers.map(u => [u.id, u.name] as const)
    );

    const servicesInRange = (allServices || []).filter(s => {
      const d = getServiceDate(s);
      return d && isValid(d) && isWithinInterval(d, interval) && shouldCount(s);
    });

    // --- Agrupar por ASESOR (serviceAdvisorId)
    const advisorMap = new Map<
      string,
      { id: string; name: string; servicesCount: number; generatedRevenue: number }
    >();

    for (const s of servicesInRange) {
      const id = (s as any).serviceAdvisorId || 'sin-asesor';
      const name =
        (s as any).serviceAdvisorName ||
        userNameById.get(id) ||
        'Sin asesor';

      const total = getServiceTotal(s);
      if (!advisorMap.has(id)) {
        advisorMap.set(id, { id, name, servicesCount: 0, generatedRevenue: 0 });
      }
      const acc = advisorMap.get(id)!;
      acc.servicesCount += 1;
      acc.generatedRevenue += total;
    }

    const advisorData = Array.from(advisorMap.values())
      .filter(a => a.servicesCount > 0)
      .sort((a, b) => b.generatedRevenue - a.generatedRevenue);

    // --- Agrupar por TÉCNICO (technicianId)
    const techMap = new Map<
      string,
      { id: string; name: string; servicesCount: number; generatedRevenue: number }
    >();

    for (const s of servicesInRange) {
      const id = (s as any).technicianId || 'sin-tecnico';
      if(id === 'sin-tecnico') continue;
      
      const name =
        (s as any).technicianName ||
        userNameById.get(id) ||
        'Sin técnico';

      const total = getServiceTotal(s);
      if (!techMap.has(id)) {
        techMap.set(id, { id, name, servicesCount: 0, generatedRevenue: 0 });
      }
      const acc = techMap.get(id)!;
      acc.servicesCount += 1;
      acc.generatedRevenue += total;
    }

    const technicianData = Array.from(techMap.values())
      .filter(t => t.servicesCount > 0)
      .sort((a, b) => b.generatedRevenue - a.generatedRevenue);

    return { advisorPerformance: advisorData, technicianPerformance: technicianData };
  }, [selectedMonth, allServices, allUsers]);

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Rendimiento de Asesores por Mes</CardTitle>
              <CardDescription>Servicios completados y monto total ingresado por cada asesor en el mes seleccionado.</CardDescription>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-[200px] bg-card">
                <SelectValue placeholder="Seleccionar mes..." />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {advisorPerformance.length > 0 ? advisorPerformance.map(person => (
            <Card key={person.id} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserIcon className="h-5 w-5" />
                  {person.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2"><Wrench className="h-4 w-4"/> Servicios Completados:</span>
                  <span className="font-bold text-lg">{person.servicesCount}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2 mt-2">
                  <span className="text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" /> Trabajo Ingresado:</span>
                  <span className="font-bold text-lg text-primary">{formatCurrency(person.generatedRevenue)}</span>
                </div>
              </CardContent>
            </Card>
          )) : (
              <div className="sm:col-span-2 lg:col-span-3 text-center text-muted-foreground p-8">
                  No hay datos de asesores para el mes seleccionado.
              </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Rendimiento de Técnicos por Mes</CardTitle>
            <CardDescription>Servicios en los que participó cada técnico y el valor total de dichos servicios.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {technicianPerformance.length > 0 ? technicianPerformance.map(person => (
                <Card key={person.id} className="shadow-sm bg-muted/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UserIcon className="h-5 w-5" />
                            {person.name}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground flex items-center gap-2"><Wrench className="h-4 w-4"/> Servicios Atendidos:</span>
                            <span className="font-bold text-lg">{person.servicesCount}</span>
                        </div>
                        <div className="flex justify-between items-center border-t pt-2 mt-2">
                            <span className="text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" /> Trabajo Ingresado:</span>
                            <span className="font-bold text-lg text-primary">{formatCurrency(person.generatedRevenue)}</span>
                        </div>
                    </CardContent>
                </Card>
            )) : (
                <div className="sm:col-span-2 lg:col-span-3 text-center text-muted-foreground p-8">
                    No hay datos de técnicos para el mes seleccionado.
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
