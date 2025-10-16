
"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NewCalendar } from "@/components/ui/calendar";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { FineCheck, Fine } from "@/types";

interface FineCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fines: Fine[];
  onSave: (fines: Fine[]) => void;
}

export function FineCheckDialog({ open, onOpenChange, fines, onSave }: FineCheckDialogProps) {
  const [localFines, setLocalFines] = useState<Fine[]>(fines || []);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    setLocalFines(fines || []);
  }, [fines]);

  const handleAddFine = () => {
    setLocalFines(prev => [
      ...prev,
      { id: crypto.randomUUID?.() ?? String(Date.now()), date: new Date().toISOString(), type: "", amount: 0 },
    ]);
  };

  const handleRemoveFine = (index: number) => {
    setLocalFines(prev => prev.filter((_, i) => i !== index));
  };

  const handleFineChange = (index: number, field: keyof Fine, value: any) => {
    setLocalFines(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
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
          {localFines.map((fine, index) => {
            const parsed = fine.date ? parseISO(fine.date) : undefined;
            const label = parsed && isValid(parsed) ? format(parsed, "PPP", { locale: es }) : "Fecha";

            return (
              <div key={fine.id ?? index} className="flex items-center gap-2">
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-[180px] justify-start text-left font-normal", !parsed && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {label}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <NewCalendar
                      value={parsed}
                      onChange={(date: any) => {
                        if (date && !Array.isArray(date)) {
                          handleFineChange(index, "date", date.toISOString());
                        }
                        setIsCalendarOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>

                <Input
                  placeholder="Motivo"
                  value={fine.type ?? ""}
                  onChange={(e) => handleFineChange(index, "type", e.target.value)}
                  className="min-w-[180px]"
                />

                <Input
                  type="number"
                  placeholder="Monto"
                  value={fine.amount ?? 0}
                  onChange={(e) => handleFineChange(index, "amount", Number(e.target.value || 0))}
                  className="w-28"
                />

                <Button variant="ghost" size="icon" onClick={() => handleRemoveFine(index)} aria-label="Eliminar multa">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}

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