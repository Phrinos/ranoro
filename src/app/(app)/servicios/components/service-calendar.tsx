
"use client";

import React, { useState, useMemo } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ServiceRecord, Vehicle, Technician, User } from '@/types';
import { isSameDay, parseISO, format, isValid, compareAsc } from 'date-fns';
import { es } from 'date-fns/locale';
import { Wrench, Clock, CheckCircle, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper function to safely parse a date that might be a string or a Date object
const safeParseISO = (date: string | Date | undefined): Date => {
  if (!date) return new Date(0); // Return an invalid date if input is null/undefined
  if (date instanceof Date) return date;
  if (typeof date === 'string') {
    const parsed = parseISO(date);
    return parsed;
  }
  return new Date(0); // Return an invalid date for other types
};

interface ServiceCalendarProps {
  services: ServiceRecord[];
  vehicles: Vehicle[];
  technicians: User[];
  onServiceClick: (service: ServiceRecord) => void;
}

export function ServiceCalendar({ services, vehicles, technicians, onServiceClick }: ServiceCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ServiceRecord[]>();
    services.forEach(service => {
      const serviceDate = safeParseISO(service.serviceDate);
      if (isValid(serviceDate)) {
        const dateKey = format(serviceDate, 'yyyy-MM-dd');
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(service);
      }
    });
    return map;
  }, [services]);

  const selectedDayServices = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(dateKey) || [];
  }, [selectedDate, eventsByDate]);

  const eventDays = useMemo(() => {
      // Need to adjust date to avoid timezone issues when converting from string
      return Array.from(eventsByDate.keys()).map(dateStr => new Date(dateStr.replace(/-/g, '/')));
  }, [eventsByDate]);

  const modifiers = {
    hasEvent: eventDays,
  };

  const getStatusVariant = (status: ServiceRecord['status']): "default" | "secondary" | "outline" | "destructive" | "success" => {
    switch (status) {
      case "Completado": return "success"; 
      case "Reparando": return "secondary"; 
      case "Cancelado": return "destructive"; 
      case "Agendado": return "default"; 
      default: return "default";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card className="sticky top-4 flex justify-center p-8">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={es}
              modifiers={modifiers}
              modifiersClassNames={{ hasEvent: 'has-event' }}
              className="p-0"
            />
        </Card>
      </div>
      <div className="lg:col-span-2">
        <h2 className="text-xl font-bold mb-4">
          Citas para {selectedDate ? format(selectedDate, "eeee, dd MMMM", { locale: es }) : 'Ninguna fecha seleccionada'}
        </h2>
        {selectedDayServices.length > 0 ? (
          <div className="space-y-4">
            {selectedDayServices.sort((a,b) => compareAsc(safeParseISO(a.serviceDate), safeParseISO(b.serviceDate))).map(service => {
              const vehicle = vehicles.find(v => v.id === service.vehicleId);
              const technician = technicians.find(t => t.id === service.technicianId);
              const serviceDateObj = safeParseISO(service.serviceDate);
              return (
                <Card key={service.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onServiceClick(service)}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-grow">
                      <p className="font-bold">{vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehículo no encontrado'}</p>
                      <p className="text-sm text-muted-foreground">{vehicle?.licensePlate}</p>
                      <p className="text-sm mt-1">{service.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-sm shrink-0">
                      <Badge variant={getStatusVariant(service.status)}>{service.status}</Badge>
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {isValid(serviceDateObj) ? format(serviceDateObj, "HH:mm 'hrs'", { locale: es }) : 'N/A'}</span>
                      <span className="flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" /> {technician?.name || 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed rounded-lg">
            <CalendarCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay citas para este día.</p>
          </div>
        )}
      </div>
    </div>
  );
}
