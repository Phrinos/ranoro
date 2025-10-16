//src/app/(app)/flotilla/componets/FineCheckDialog.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NewCalendar } from '@/components/ui/calendar';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Fine } from '@/types';

interface FineCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fines: Fine[];
  onSave: (fines: Fine[]) => void;
}

export function FineCheckDialog({ open, onOpenChange, fines, onSave }: FineCheckDialogProps) {
  const [localFines, setLocalFines] = useState(fines || []);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    setLocalFines(fines || []);
  }, [fines]);

  const handleAddFine = () => {
    setLocalFines([...localFines, { date: new Date().toISOString(), reason: '', amount: 0 }]);
  };

  const handleRemoveFine = (index: number) => {
    setLocalFines(localFines.filter((_, i) => i !== index));
  };

  const handleFineChange = (index: number, field: keyof Fine, value: any) => {
    const updatedFines = [...localFines];
    updatedFines[index] = { ...updatedFines[index], [field]: value };
    setLocalFines(updatedFines);
  };

  const handleSave = () => {
    onSave(localFines);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revisión de Multas</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {localFines.map((fine, index) => (
            <div key={index} className="flex items-center space-x-2">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[180px] justify-start text-left font-normal",
                      !fine.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fine.date ? format(parseISO(fine.date), "PPP", { locale: es }) : <span>Fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <NewCalendar
                    value={parseISO(fine.date)}
                    onChange={(date) => {
                      if(date && !Array.isArray(date)) handleFineChange(index, 'date', date.toISOString());
                      setIsCalendarOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Input
                placeholder="Motivo"
                value={fine.reason}
                onChange={(e) => handleFineChange(index, 'reason', e.target.value)}
              />
              <Input
                type="number"
                placeholder="Monto"
                value={fine.amount}
                onChange={(e) => handleFineChange(index, 'amount', parseFloat(e.target.value))}
              />
              <Button variant="ghost" size="icon" onClick={() => handleRemoveFine(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={handleAddFine}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Multa
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
