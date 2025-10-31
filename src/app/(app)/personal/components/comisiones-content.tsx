
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
    if (!selectedMonth || allUsers.length === 0) return { advisorPerformance: [], technicianPerformance: [] };
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(startDate);
    const interval = { start: startDate, end: endDate };

    const completedServicesInRange = allServices.filter(s => {
        const deliveryDate = parseDate(s.deliveryDateTime);
        return s.status === 'Entregado' && deliveryDate && isValid(deliveryDate) && isWithinInterval(deliveryDate, interval);
    });
    
    const advisors = allUsers.filter(u => !u.isArchived && (u.functions?.includes('asesor') || u.role.toLowerCase().includes('asesor')));
    const technicians = allUsers.filter(u => !u.isArchived && (u.functions?.includes('tecnico') || u.role.toLowerCase().includes('tecnico')));
    
    const advisorData = advisors.map(advisor => {
        const servicesForAdvisor = completedServicesInRange.filter(s => s.serviceAdvisorId === advisor.id);
        const totalRevenue = servicesForAdvisor.reduce((sum, s) => sum + (Number(s.totalCost) || 0), 0);
        return {
            id: advisor.id,
            name: advisor.name,
            servicesCount: servicesForAdvisor.length,
            generatedRevenue: totalRevenue,
        };
    })
    .filter(data => data.servicesCount > 0)
    .sort((a,b) => b.generatedRevenue - a.generatedRevenue);

    const techPerformanceMap: Record<string, { id: string; name: string; services: Set<string>; generatedRevenue: number; }> = {};

    completedServicesInRange.forEach(service => {
        const serviceTotal = Number(service.totalCost) || 0;
        const techsInService = new Set<string>();

        (service.serviceItems || []).forEach(item => {
            const techId = (item as any).technicianId;
            if (techId) {
                techsInService.add(techId);
            }
        });
        
        // Also consider the main technician if assigned
        if (service.technicianId) {
          techsInService.add(service.technicianId);
        }

        techsInService.forEach(techId => {
            if (!techPerformanceMap[techId]) {
                const techUser = technicians.find(t => t.id === techId);
                if (techUser) {
                    techPerformanceMap[techId] = {
                        id: techId,
                        name: techUser.name,
                        services: new Set(),
                        generatedRevenue: 0,
                    };
                }
            }
            if (techPerformanceMap[techId]) {
                if (!techPerformanceMap[techId].services.has(service.id)) {
                    techPerformanceMap[techId].services.add(service.id);
                    techPerformanceMap[techId].generatedRevenue += serviceTotal;
                }
            }
        });
    });

    const technicianData = Object.values(techPerformanceMap)
        .map(tech => ({
            ...tech,
            servicesCount: tech.services.size
        }))
        .sort((a, b) => b.generatedRevenue - a.generatedRevenue);

    return { advisorPerformance: advisorData, technicianPerformance: technicianData };

  }, [selectedMonth, allUsers, allServices]);

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
                            <span className="text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" /> Trabajo Realizado:</span>
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
