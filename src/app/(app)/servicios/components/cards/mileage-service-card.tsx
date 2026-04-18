// src/app/(app)/servicios/components/cards/mileage-service-card.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NewCalendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { parseDate } from "@/lib/forms";
import type { NextServiceInfo } from "@/types";

interface MileageServiceCardProps {
  nextServiceInfo: NextServiceInfo;
  onUpdate: (info: NextServiceInfo) => void;
  currentMileage?: number | null;
  onUpdateCurrentMileage?: (mileage: number | null) => void;
}

export function MileageServiceCard({
  nextServiceInfo,
  onUpdate,
  currentMileage,
  onUpdateCurrentMileage,
}: MileageServiceCardProps) {
  const [calOpen, setCalOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [nextMileage, setNextMileage] = useState<number | "">("");

  useEffect(() => {
    setDate(nextServiceInfo?.date ? (parseDate(nextServiceInfo.date) ?? undefined) : undefined);
    setNextMileage(typeof nextServiceInfo?.mileage === "number" ? nextServiceInfo.mileage : "");
  }, [nextServiceInfo]);

  const baseMileage = typeof currentMileage === "number" && !isNaN(currentMileage) ? currentMileage : 0;

  const handleSetDateOffset = (months: number) => {
    const newDate = addMonths(new Date(), months);
    setDate(newDate);
    onUpdate({ date: newDate.toISOString(), mileage: Number(nextMileage) || undefined });
  };

  const handleSetMileageOffset = (km: number) => {
    const nm = baseMileage + km;
    setNextMileage(nm);
    onUpdate({ date: date?.toISOString(), mileage: nm });
  };

  return (
    <div className="flex flex-col h-full justify-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Kilometraje y Servicio
      </span>
      <div className="grid grid-cols-2 gap-4 items-start">
        {/* KM Actual */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
            KM Actual
          </span>
          <Input
            type="number"
            placeholder="0"
            value={currentMileage ?? ""}
            className="font-mono bg-background text-right h-11 text-lg font-bold text-primary"
            onChange={(e) => {
              const val = e.target.value;
              onUpdateCurrentMileage?.(val === "" ? null : Number(val));
            }}
          />
        </div>

        {/* Próximo Servicio */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">
            Próximo Servicio
          </span>

          {/* Fecha row */}
          <div className="flex items-center gap-1">
            <Popover open={calOpen} onOpenChange={setCalOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "flex-1 min-w-0 justify-start text-left font-normal h-8 text-[11px] px-2 truncate",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1 h-3 w-3 shrink-0" />
                  {date ? format(date, "dd/MM/yy") : "Fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <NewCalendar
                  onChange={(d) => {
                    if (d && !Array.isArray(d)) {
                      setDate(d);
                      setCalOpen(false);
                      onUpdate({ date: d.toISOString(), mileage: Number(nextMileage) || undefined });
                    }
                  }}
                  value={date}
                  minDate={new Date()}
                  locale="es-MX"
                />
              </PopoverContent>
            </Popover>
            <div className="flex shrink-0">
              <Button
                type="button"
                variant="secondary"
                className="h-8 px-1.5 text-[10px] rounded-r-none border-r border-background/20"
                onClick={() => handleSetDateOffset(6)}
              >
                +6m
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-8 px-1.5 text-[10px] rounded-l-none"
                onClick={() => handleSetDateOffset(12)}
              >
                +12m
              </Button>
            </div>
          </div>

          {/* KM row */}
          <div className="flex items-center gap-1">
            <Input
              type="number"
              placeholder="0 km"
              value={nextMileage}
              className="flex-1 min-w-0 font-mono bg-muted/30 text-right h-8 text-[11px] px-2"
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  setNextMileage("");
                  onUpdate({ date: date?.toISOString(), mileage: undefined });
                  return;
                }
                const nm = Number(v);
                setNextMileage(nm);
                onUpdate({ date: date?.toISOString(), mileage: isFinite(nm) ? nm : undefined });
              }}
            />
            <div className="flex shrink-0">
              <Button
                type="button"
                variant="secondary"
                className="h-8 px-1.5 text-[10px] rounded-r-none border-r border-background/20"
                onClick={() => handleSetMileageOffset(5000)}
              >
                +5k
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-8 px-1.5 text-[10px] rounded-l-none"
                onClick={() => handleSetMileageOffset(10000)}
              >
                +10k
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
