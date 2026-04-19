"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ServiceRecord, User } from '@/types';
import { format, startOfMonth, endOfMonth, isWithinInterval, isValid, parseISO } from "date-fns";
import { es } from 'date-fns/locale';
import { formatCurrency, capitalizeWords } from "@/lib/utils";
import { User as UserIcon, Wrench, DollarSign, Wallet } from 'lucide-react';
import { parseDate } from '@/lib/forms';
import { Badge } from "@/components/ui/badge";

const toNumber = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v) : (Number(v) as number);
  return Number.isFinite(n) ? n : 0;
};

const getServiceDate = (s: ServiceRecord) => {
  return (
    parseDate((s as any).deliveryDateTime) ||
    parseDate((s as any).completedAt) ||
    parseDate((s as any).createdAt) ||
    (typeof (s as any).date === 'string' ? parseISO((s as any).date) : undefined)
  );
};

const getServiceTotal = (s: ServiceRecord) => {
  return toNumber((s as any).total ?? (s as any).totalCost ?? (s as any).grandTotal);
};

const shouldCount = (s: ServiceRecord) => s.status === 'Entregado';

const normalizeText = (s?: string) =>
  (s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const equalsRelaxed = (a?: string, b?: string) => normalizeText(a) === normalizeText(b);

const matchByIdOrName = (user: User, id?: string | null, name?: string | null) => {
  if (!user) return false;
  if (id && user.id && id === user.id) return true;
  if (name && user.name && equalsRelaxed(name, user.name)) return true;
  return false;
};

const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
  const lowerCaseRole = (role || '').toLowerCase();
  if (lowerCaseRole.includes('asesor')) return 'default';
  if (lowerCaseRole.includes('tecnico') || lowerCaseRole.includes('técnico')) return 'secondary';
  return 'outline';
};

const generateMonthOptions = () => {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = format(date, 'yyyy-MM');
    const label = capitalizeWords(format(date, 'MMMM yyyy', { locale: es }));
    options.push({ value, label });
  }
  return options;
};

interface ComisionesContentProps {
  allServices: ServiceRecord[];
  allUsers: User[];
}

export default function ComisionesContent({ allServices, allUsers }: ComisionesContentProps) {
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0]?.value || '');

  const performanceData = useMemo(() => {
    if (!selectedMonth || allUsers.length === 0) return [];

    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(startDate);
    const interval = { start: startDate, end: endDate };

    const completedServicesInRange = (allServices || []).filter(s => {
      const d = getServiceDate(s);
      return d && isValid(d) && isWithinInterval(d, interval) && shouldCount(s);
    });

    const activeUsers = allUsers.filter((u) => !u.isArchived);

    return activeUsers
      .map((user) => {
        let generatedRevenue = 0;
        let servicesCount = 0;
        const commissionRate = user.commissionRate || 0;
        const countedServiceIds = new Set<string>();

        for (const service of completedServicesInRange) {
          const sid = (service as any).id ?? '';
          if (!sid || countedServiceIds.has(sid)) continue;

          const serviceTotal = getServiceTotal(service);
          const isAdvisor = matchByIdOrName(user, (service as any).serviceAdvisorId, (service as any).serviceAdvisorName);
          const isTechnician = matchByIdOrName(user, (service as any).technicianId, (service as any).technicianName);

          if (isAdvisor || isTechnician) {
            generatedRevenue += serviceTotal;
            servicesCount += 1;
            countedServiceIds.add(sid);
          }
        }

        const totalCommission = commissionRate > 0 ? (generatedRevenue * commissionRate) / 100 : 0;
        const baseSalary = user.monthlySalary || 0;
        const totalSalary = baseSalary + totalCommission;

        return {
          id: user.id,
          name: user.name,
          role: user.role || 'Personal',
          servicesCount,
          baseSalary,
          generatedRevenue,
          commission: totalCommission,
          commissionRate,
          totalSalary,
        };
      })
      .filter(p => p.servicesCount > 0 || p.baseSalary > 0)
      .sort((a, b) => b.totalSalary - a.totalSalary);
  }, [selectedMonth, allServices, allUsers]);

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Comisiones y Rendimiento</CardTitle>
              <CardDescription>
                Resumen de tareas atendidas, ingresos generados, comisiones y sueldos mensuales.
              </CardDescription>
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
        <CardContent className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {performanceData.length > 0 ? performanceData.map(person => (
            <Card key={person.id} className="shadow-sm overflow-hidden border-border/50">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-muted-foreground" />
                    {person.name}
                  </CardTitle>
                </div>
                <div className="pt-1">
                  <Badge variant={getRoleBadgeVariant(person.role)}>{person.role}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 text-sm">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="flex items-center gap-2"><Wrench className="h-4 w-4" /> Tareas atendidas</span>
                  <span className="font-semibold text-foreground">{person.servicesCount}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Ingreso Generado</span>
                  <span className="font-semibold text-foreground">{formatCurrency(person.generatedRevenue)}</span>
                </div>
                <div className="border-t border-border/50 pt-3 mt-2 space-y-2">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Sueldo base</span>
                    <span className="font-semibold text-foreground">{formatCurrency(person.baseSalary)}</span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Comisión ({person.commissionRate}%)</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-500">{formatCurrency(person.commission)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-border pt-3 mt-2 font-bold bg-muted/10 p-2 rounded-lg">
                  <span className="text-foreground flex items-center gap-2"><Wallet className="h-4 w-4" /> Total a Pagar</span>
                  <span className="text-lg text-primary">{formatCurrency(person.totalSalary)}</span>
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="sm:col-span-2 xl:col-span-3 text-center text-muted-foreground p-8 border rounded-xl bg-muted/20">
              No hay registros de comisiones o participación en este mes.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
