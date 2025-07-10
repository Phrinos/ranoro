
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Search, Calendar as CalendarIcon } from 'lucide-react';
import { placeholderAuditLogs } from '@/lib/placeholder-data';
import type { AuditLog } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format, parseISO, compareDesc, isValid, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

export function AuditoriaPageContent() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    // This will be updated if placeholder-data changes via the main page's event listener
    setLogs(placeholderAuditLogs);
  }, []);

  const filteredLogs = useMemo(() => {
    let filtered = [...logs];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.userName.toLowerCase().includes(lowerSearch) ||
        log.description.toLowerCase().includes(lowerSearch) ||
        log.actionType.toLowerCase().includes(lowerSearch)
      );
    }
    if (dateRange?.from) {
      const from = startOfDay(dateRange.from);
      const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      filtered = filtered.filter(log => {
          const logDate = parseISO(log.date);
          return isValid(logDate) && isWithinInterval(logDate, { start: from, end: to });
      });
    }
    // Already sorted by date desc on creation, but we can re-sort to be safe
    return filtered.sort((a,b) => compareDesc(parseISO(a.date), parseISO(b.date)));
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
              className="w-full rounded-lg bg-background pl-8 md:w-full lg:w-2/3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
         <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn("w-full md:w-[280px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "dd LLL, y", {locale: es})} - ${format(dateRange.to, "dd LLL, y", {locale: es})}` : format(dateRange.from, "dd LLL, y", {locale: es})) : "Filtrar por fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              locale={es}
            />
          </PopoverContent>
        </Popover>
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
                {filteredLogs.length > 0 ? (
                  filteredLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs">{format(parseISO(log.date), "dd/MM/yy, HH:mm:ss", { locale: es })}</TableCell>
                      <TableCell className="font-medium">{log.userName}</TableCell>
                      <TableCell><Badge variant={log.actionType === 'Eliminar' || log.actionType === 'Cancelar' ? 'destructive' : 'secondary'}>{log.actionType}</Badge></TableCell>
                      <TableCell>{log.description}</TableCell>
                    </TableRow>
                  ))
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
