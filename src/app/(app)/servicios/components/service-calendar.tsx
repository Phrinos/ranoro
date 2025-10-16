// src/app/(app)/servicios/components/service-calendar.tsx
"use client";

import React, { useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ServiceRecord, Vehicle, Technician, User } from '@/types';
import { isSameDay, parseISO, format, isValid, compareAsc } from 'date-fns';
import { es } from 'date-fns/locale';
import { Wrench, Clock, CheckCircle, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseDate } from '@/lib/forms';

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
      const eventDate = parseDate(service.appointmentDateTime || service.serviceDate);
      
      if (eventDate && isValid(eventDate)) {
        const dateKey = format(eventDate, 'yyyy-MM-dd');
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
    const unsortedServices = eventsByDate.get(dateKey) || [];
    
    return unsortedServices.sort((a, b) => {
        const dateA = parseDate(a.appointmentDateTime || a.serviceDate) || new Date(0);
        const dateB = parseDate(b.appointmentDateTime || b.serviceDate) || new Date(0);
        return compareAsc(dateA, dateB);
    });
  }, [selectedDate, eventsByDate]);
  
  const handleDateChange = (value: any) => {
      if (value instanceof Date) {
          setSelectedDate(value);
      }
  };

  const getStatusVariant = (status: ServiceRecord['status'], subStatus?: ServiceRecord['subStatus']): "default" | "secondary" | "outline" | "destructive" | "success" => {
    if (status === 'Agendado' && subStatus === 'Confirmada') return 'success';
    if (status === 'Agendado' && subStatus === 'Sin Confirmar') return 'secondary';
    return 'default';
  };
  
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dateKey = format(date, 'yyyy-MM-dd');
      if (eventsByDate.has(dateKey)) {
        return 'has-event';
      }
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1">
        <Card className="sticky top-4 flex justify-center p-8">
            <Calendar
              onChange={handleDateChange}
              value={selectedDate}
              locale="es-MX"
              tileClassName={tileClassName}
            />
        </Card>
      </div>
      <div className="lg:col-span-2">
        <h2 className="text-xl font-bold mb-4">
          Citas para {selectedDate ? format(selectedDate, "eeee, dd MMMM", { locale: es }) : 'Ninguna fecha seleccionada'}
        </h2>
        {selectedDayServices.length > 0 ? (
          <div className="space-y-4">
            {selectedDayServices.map(service => {
              const vehicle = vehicles.find(v => v.id === service.vehicleId);
              const technician = technicians.find(t => t.id === service.technicianId);
              const serviceDateObj = parseDate(service.appointmentDateTime || service.serviceDate);
              return (
                <Card key={service.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => onServiceClick(service)}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex-grow">
                      <p className="font-bold">{vehicle ? `${vehicle.make} ${vehicle.model}` : 'Vehículo no encontrado'}</p>
                      <p className="text-sm text-muted-foreground">{vehicle?.licensePlate}</p>
                      <p className="text-sm mt-1">{service.description || 'Sin descripción'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-sm shrink-0">
                      <Badge variant={getStatusVariant(service.status, service.subStatus)}>{service.subStatus || service.status}</Badge>
                      <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {isValid(serviceDateObj ?? new Date()) ? format(serviceDateObj as Date, "HH:mm 'hrs'", { locale: es }) : 'N/A'}</span>
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
