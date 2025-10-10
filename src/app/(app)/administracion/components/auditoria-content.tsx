
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from 'lucide-react';
import type { AuditLog } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, isWithinInterval, startOfDay, endOfDay, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { adminService } from '@/lib/services';
import { parseDate } from '@/lib/forms';
import { Loader2 } from 'lucide-react';

export function AuditoriaPageContent({ initialLogs }: { initialLogs: AuditLog[] }) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = adminService.onAuditLogsUpdate((updatedLogs) => {
        setLogs(updatedLogs);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredLogs = useMemo(() => {
    let filtered = [...logs];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        (log.userName || '').toLowerCase().includes(lowerSearch) ||
        (log.description || '').toLowerCase().includes(lowerSearch) ||
        (log.actionType || '').toLowerCase().includes(lowerSearch)
      );
    }
    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(from);
      filtered = filtered.filter(log => {
          const logDate = parseDate(log.date);
          return logDate && isValid(logDate) && isWithinInterval(logDate, { start: from, end: to });
      });
    }
    // La data ya viene ordenada por fecha desde Firestore
    return filtered;
  }, [logs, searchTerm, dateRange]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Registro de Auditoría</h2>
          <p className="text-muted-foreground">Registro de todas las acciones importantes en el sistema.</p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por usuario, acción o descripción..."
              className="w-full rounded-lg bg-card pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="bg-black">
                <TableRow>
                  <TableHead className="text-white w-[180px]">Fecha</TableHead>
                  <TableHead className="text-white w-[150px]">Usuario</TableHead>
                  <TableHead className="text-white w-[120px]">Tipo de Acción</TableHead>
                  <TableHead className="text-white">Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-48 text-center">
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Cargando registros...</span>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map(log => {
                    const logDate = parseDate(log.date);
                    return (
                        <TableRow key={log.id}>
                            <TableCell className="font-mono text-xs whitespace-nowrap">
                                {logDate && isValid(logDate) ? format(logDate, "dd/MM/yy, HH:mm:ss", { locale: es }) : "Fecha no disponible"}
                            </TableCell>
                            <TableCell className="font-medium">{log.userName}</TableCell>
                            <TableCell><Badge variant={log.actionType === 'Eliminar' || log.actionType === 'Cancelar' ? 'destructive' : 'secondary'}>{log.actionType}</Badge></TableCell>
                            <TableCell>{log.description}</TableCell>
                        </TableRow>
                    );
                })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No hay registros de auditoría para mostrar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
