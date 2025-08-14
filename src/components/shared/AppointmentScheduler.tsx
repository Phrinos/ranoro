
"use client";

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { isWeekend, isPast, setHours, setMinutes, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface AppointmentSchedulerProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (selectedDateTime: Date) => Promise<void>;
}

const weekdayTimes = [
  { hours: 8, minutes: 30, label: "8:30 AM" },
  { hours: 13, minutes: 30, label: "1:30 PM" },
];

const saturdayTimes = [
  { hours: 8, minutes: 30, label: "8:30 AM" },
];

export function AppointmentScheduler({ open, onOpenChange, onConfirm }: AppointmentSchedulerProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<{ hours: number; minutes: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const today = new Date();

  const handleDateSelect = (date?: Date) => {
    if (date) {
      setSelectedDate(date);
      setSelectedTime(null); // Reset time when date changes
    }
  };

  const availableTimes = useMemo(() => {
    if (!selectedDate) return [];
    const dayOfWeek = selectedDate.getDay(); // Sunday is 0, Saturday is 6
    if (dayOfWeek === 0) return []; // Sunday
    if (dayOfWeek === 6) return saturdayTimes; // Saturday
    return weekdayTimes; // Weekdays
  }, [selectedDate]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast({ title: "Información incompleta", description: "Por favor, seleccione una fecha y una hora.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    const finalDateTime = setMinutes(setHours(selectedDate, selectedTime.hours), selectedTime.minutes);
    
    try {
      await onConfirm(finalDateTime);
    } catch(e) {
       // Error toast is handled by the parent component that calls onConfirm
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Agendar Cita de Servicio</DialogTitle>
          <DialogDescription>
            Seleccione una fecha y hora disponible para traer su vehículo.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 space-y-4">
            <div className="flex justify-center">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => isPast(date) && !isSameDay(date, today) || isWeekend(date) && date.getDay() === 0}
                    locale={es}
                    initialFocus
                />
            </div>

            {selectedDate && (
                 <div>
                    <p className="text-sm font-medium text-center mb-2">Horarios disponibles para el {format(selectedDate, 'dd MMMM', { locale: es })}:</p>
                    <div className="grid grid-cols-2 gap-2">
                        {availableTimes.map((time, index) => (
                             <Button
                                key={index}
                                variant={selectedTime?.hours === time.hours ? "default" : "outline"}
                                onClick={() => setSelectedTime(time)}
                                className="w-full"
                            >
                                {time.label}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
        <DialogFooter className="p-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!selectedDate || !selectedTime || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
            Confirmar Cita
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
