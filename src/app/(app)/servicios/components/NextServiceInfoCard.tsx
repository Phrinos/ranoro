
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
}

export function NextServiceInfoCard({ nextServiceInfo, onUpdate, isSubmitting }: NextServiceInfoCardProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(nextServiceInfo.date ? parseDate(nextServiceInfo.date) : undefined);
  const [mileage, setMileage] = useState<number | ''>(nextServiceInfo.mileage || '');
  
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
                <Calendar
                  value={date}
                  onChange={(d) => {
                    if (d && !Array.isArray(d)) setDate(d);
                    setIsCalendarOpen(false);
                  }}
                  minDate={new Date()}
                />
              </PopoverContent>
            </Popover>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleSetReminder(3)}>+3m</Button>
              <Button size="sm" variant="outline" onClick={() => handleSetReminder(6)}>+6m</Button>
            </div>
          </div>
          <Input
            type="number"
            placeholder="Kilometraje"
            value={mileage}
            onChange={(e) => setMileage(Number(e.target.value))}
          />
        </div>
        <Button onClick={handleUpdate} disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Guardando...' : 'Guardar Próximo Servicio'}
        </Button>
      </CardContent>
    </Card>
  );
}
