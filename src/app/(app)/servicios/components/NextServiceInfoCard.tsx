"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { CalendarIcon } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import type { NextServiceInfo } from '@/types';
import { cn } from '@/lib/utils';
import { parseDate } from '@/lib/forms';

interface NextServiceInfoCardProps {
  nextServiceInfo: NextServiceInfo;
  onUpdate: (info: NextServiceInfo) => void;
  isSubmitting: boolean;
  currentMileage?: number | null;
}

export function NextServiceInfoCard({ nextServiceInfo, onUpdate, isSubmitting, currentMileage }: NextServiceInfoCardProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [mileage, setMileage] = useState<number | ''>('');

  useEffect(() => {
    const parsed = nextServiceInfo?.date ? parseDate(nextServiceInfo.date) : null;
    setDate(parsed ?? undefined);
    setMileage(nextServiceInfo?.mileage || '');
  }, [nextServiceInfo]);
  
  const handleUpdate = () => {
    onUpdate({
      date: date ? date.toISOString() : null,
      mileage: Number(mileage) || null,
    });
  };

  const handleSetReminder = (months: number) => {
    const newDate = addMonths(new Date(), months);
    setDate(newDate);
    // Automatically trigger update when a button is clicked
    onUpdate({ date: newDate.toISOString(), mileage: Number(mileage) || null });
  };
  
  const handleSetMileageReminder = (km: number) => {
    const current = Number(currentMileage || 0);
    const newMileage = current + km;
    setMileage(newMileage);
    // Automatically trigger update when a button is clicked
    onUpdate({ date: date ? date.toISOString() : null, mileage: newMileage });
  };
  
  const onCalendarChange = (newDate: any) => {
    if (newDate && !Array.isArray(newDate)) {
      setDate(newDate);
      setIsCalendarOpen(false);
      // Automatically trigger update when a date is picked
      onUpdate({ date: newDate.toISOString(), mileage: Number(mileage) || null });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Próximo Servicio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: es }) : <span>Fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  onChange={onCalendarChange}
                  value={date}
                  minDate={new Date()}
                  locale="es-MX"
                />
              </PopoverContent>
            </Popover>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => handleSetReminder(3)}>+3m</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => handleSetReminder(6)}>+6m</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => handleSetReminder(12)}>+12m</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Input
              type="number"
              placeholder="Kilometraje"
              value={mileage}
              onChange={(e) => {
                const newMileage = Number(e.target.value);
                setMileage(newMileage);
                onUpdate({ date: date ? date.toISOString() : null, mileage: newMileage || null });
              }}
            />
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => handleSetMileageReminder(5000)}>+5k</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => handleSetMileageReminder(7500)}>+7.5k</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => handleSetMileageReminder(10000)}>+10k</Button>
            </div>
          </div>
        </div>
        {/* El botón de guardar ya no es necesario, los cambios se aplican al interactuar */}
      </CardContent>
    </Card>
  );
}
