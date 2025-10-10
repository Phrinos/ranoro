// src/app/(app)/servicios/components/NextServiceInfoCard.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NewCalendar } from '@/components/ui/calendar';
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
    // Sincroniza el estado local cuando las props cambian
    setDate(nextServiceInfo?.date ? parseDate(nextServiceInfo.date) : undefined);
    setMileage(nextServiceInfo?.mileage || '');
  }, [nextServiceInfo]);
  
  const handleUpdate = () => {
    onUpdate({
      date: date ? date.toISOString() : '',
      mileage: Number(mileage) || 0,
    });
  };

  const handleSetReminder = (months: number) => {
    const newDate = addMonths(new Date(), months);
    setDate(newDate);
  };
  
  const handleSetMileageReminder = (km: number) => {
    const current = Number(currentMileage || 0);
    setMileage(current + km);
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
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: es }) : <span>Fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <NewCalendar
                  value={date}
                  onChange={(d: any) => {
                    setDate(d);
                    setIsCalendarOpen(false);
                  }}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleSetReminder(3)}>+3m</Button>
              <Button size="sm" variant="outline" onClick={() => handleSetReminder(6)}>+6m</Button>
              <Button size="sm" variant="outline" onClick={() => handleSetReminder(12)}>+12m</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Input
              type="number"
              placeholder="Kilometraje"
              value={mileage}
              onChange={(e) => setMileage(Number(e.target.value))}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleSetMileageReminder(5000)}>+5k</Button>
              <Button size="sm" variant="outline" onClick={() => handleSetMileageReminder(7500)}>+7.5k</Button>
              <Button size="sm" variant="outline" onClick={() => handleSetMileageReminder(10000)}>+10k</Button>
            </div>
          </div>
        </div>
        <Button onClick={handleUpdate} disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Guardando...' : 'Guardar Próximo Servicio'}
        </Button>
      </CardContent>
    </Card>
  );
}
