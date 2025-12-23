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
import type { Fine } from "@/types";

interface FineCheckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fines: Fine[];
  onSave: (fines: Fine[]) => void;
}

type RCValue = Date | Date[] | null;

export function FineCheckDialog({ open, onOpenChange, fines, onSave }: FineCheckDialogProps) {
  const [localFines, setLocalFines] = useState<Fine[]>(fines || []);
  const [openCalendarFor, setOpenCalendarFor] = useState<string | null>(null);

  useEffect(() => {
    setLocalFines(fines || []);
  }, [fines]);

  const handleAddFine = () => {
    setLocalFines((prev) => [
      ...prev,
      {
        id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
        date: new Date().toISOString(),
        type: "",
        amount: 0,
        description: "", // ✅ REQUIRED por tu tipo Fine
      },
    ]);
  };

  const handleRemoveFine = (index: number) => {
    setLocalFines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFineChange = <K extends keyof Fine>(index: number, field: K, value: Fine[K]) => {
    setLocalFines((prev) => {
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Revisión de Multas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {localFines.map((fine, index) => {
            const parsed = fine.date ? parseISO(fine.date) : undefined;
            const label = parsed && isValid(parsed) ? format(parsed, "PPP", { locale: es }) : "Fecha";
            const fineId = fine.id ?? String(index);

            return (
              <div key={fineId} className="flex flex-wrap items-center gap-2">
                <Popover open={openCalendarFor === fineId} onOpenChange={(v) => setOpenCalendarFor(v ? fineId : null)}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn("w-[180px] justify-start text-left font-normal", !parsed && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {label}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0" align="start">
                    <NewCalendar
                      value={parsed ?? null}
                      onChange={(value: RCValue) => {
                        const d = Array.isArray(value) ? value[0] : value;
                        if (d instanceof Date && isValid(d)) {
                          handleFineChange(index, "date", d.toISOString());
                        }
                        setOpenCalendarFor(null);
                      }}
                    />
                  </PopoverContent>
                </Popover>

                <Input
                  placeholder="Motivo"
                  value={fine.type ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    handleFineChange(index, "type", v);
                    // opcional: sincroniza description con type
                    if (!fine.description) handleFineChange(index, "description", v);
                  }}
                  className="min-w-[180px]"
                />

                <Input
                  type="number"
                  placeholder="Monto"
                  value={fine.amount ?? 0}
                  onChange={(e) => handleFineChange(index, "amount", Number(e.target.value || 0))}
                  className="w-28"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFine(index)}
                  aria-label="Eliminar multa"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}

          <Button type="button" variant="outline" onClick={handleAddFine}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Multa
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}