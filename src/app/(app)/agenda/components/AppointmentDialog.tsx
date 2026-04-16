"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Car, FileText, Check, CalendarIcon, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { inventoryService } from "@/lib/services";
import { agendaService } from "@/lib/services/agenda.service";
import type { Vehicle, User, Appointment, ServiceRecord } from "@/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  selectedDate?: Date;
  personnel?: User[]; // Kept for interface compatibility, but unused since we simplified the form
  serviceTypes?: string[];
  onSaved?: () => void;
}

const STATUS_OPTIONS: Appointment["status"][] = [
  "Pendiente", "Confirmada", "Cancelada", "No se presentó", "Completada"
];

const TIME_SLOTS = ["08:30", "13:30"];

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  selectedDate,
  serviceTypes = [],
  onSaved,
}: AppointmentDialogProps) {
  const { toast } = useToast();
  const isEdit = !!appointment;

  // Vehicle search & Temporal Car
  const [plateQuery, setPlateQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [prevQuotes, setPrevQuotes] = useState<ServiceRecord[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Temporal car fields
  const [tempMake, setTempMake] = useState("");
  const [tempModel, setTempModel] = useState("");
  const [tempYear, setTempYear] = useState("");

  // Form fields
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState<string>("08:30");
  const [status, setStatus] = useState<Appointment["status"]>("Pendiente");
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill
  useEffect(() => {
    if (open) {
      if (appointment) {
        // Edit mode
        setPlateQuery(appointment.licensePlate || "");
        if (appointment.appointmentDateTime) {
          const d = new Date(appointment.appointmentDateTime);
          setDateStr(format(d, "yyyy-MM-dd"));
          setTimeStr(format(d, "HH:mm"));
        }
        setStatus(appointment.status);
        setSelectedServiceTypes(appointment.serviceTypeLabels || []);
        
        // Auto-select true vehicle if ID is not "temporal"
        if (appointment.vehicleId && appointment.vehicleId !== "temporal") {
          inventoryService.getVehicleById(appointment.vehicleId).then((v) => {
            if (v) setSelectedVehicle(v);
          });
        }
      } else {
        // New mode
        setPlateQuery("");
        setSearchResults([]);
        setSelectedVehicle(null);
        setHasSearched(false);
        setPrevQuotes([]);
        
        // Use calendar date or today
        setDateStr(format(selectedDate || new Date(), "yyyy-MM-dd"));
        setTimeStr("08:30");
        setStatus("Pendiente");
        setSelectedServiceTypes([]);
        setTempMake("");
        setTempModel("");
        setTempYear("");
      }
    }
  }, [open, appointment, selectedDate]);

  // Handle Search
  const handleSearch = useCallback(async () => {
    const q = plateQuery.trim().toUpperCase();
    if (q.length < 4) {
      toast({ title: "Ingresa al menos 4 caracteres de la placa" });
      return;
    }
    setIsSearching(true);
    setHasSearched(false);
    setSelectedVehicle(null);
    try {
      const all = await inventoryService.onVehiclesUpdatePromise();
      const filtered = all.filter((v: Vehicle) =>
        v.licensePlate?.toUpperCase().includes(q)
      );
      setSearchResults(filtered);
      setHasSearched(true);
      
      // Auto-select if exact match
      if (filtered.length === 1 && filtered[0].licensePlate.toUpperCase() === q) {
        handleSelectVehicle(filtered[0]);
      }
    } catch {
      toast({ title: "Error buscando vehículos", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }, [plateQuery, toast]);

  const handleSelectVehicle = useCallback(async (v: Vehicle) => {
    setSelectedVehicle(v);
    setPlateQuery(v.licensePlate);
    setSearchResults([]);
    setHasSearched(false);
    setLoadingQuotes(true);
    try {
      const quotes = await agendaService.getQuotesForVehicle(v.id);
      setPrevQuotes(quotes);
    } finally {
      setLoadingQuotes(false);
    }
  }, []);

  const toggleServiceType = (type: string) => {
    setSelectedServiceTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSave = async () => {
    if (!plateQuery.trim()) {
      toast({ title: "Ingresa la placa del vehículo", variant: "destructive" });
      return;
    }
    if (!dateStr || !timeStr) {
      toast({ title: "Selecciona fecha y hora", variant: "destructive" });
      return;
    }

    // Prepare robust ISO date
    const isoDateTime = new Date(`${dateStr}T${timeStr}:00`).toISOString();

    // Determine vehicle data
    // If not a formal selectedVehicle, we use the temporary data entered
    const isTemporal = !selectedVehicle;
    const vMake = isTemporal ? tempMake || "Automóvil" : selectedVehicle.make;
    const vModel = isTemporal ? tempModel || "" : selectedVehicle.model;
    const vYear = isTemporal ? tempYear || "" : selectedVehicle.year;
    
    const derivedIdentifier = `${vMake} ${vModel}${vYear ? ` ${vYear}` : ""} – ${plateQuery.toUpperCase()}`.trim();

    const rawPayload: Partial<Appointment> = {
      vehicleId: selectedVehicle?.id || "temporal",
      licensePlate: plateQuery.toUpperCase(),
      vehicleIdentifier: derivedIdentifier,
      ownerName: selectedVehicle?.ownerName || undefined,
      ownerPhone: selectedVehicle?.ownerPhone || undefined,
      appointmentDateTime: isoDateTime,
      status,
      serviceTypeLabels: selectedServiceTypes.length ? selectedServiceTypes : undefined,
    };

    if (prevQuotes.length > 0 && !isEdit) {
      rawPayload.relatedQuoteId = prevQuotes[0].id;
    }

    // Strip undefined to prevent firebase errors: "Firestore doesn't support undefined"
    const safePayload = Object.fromEntries(
      Object.entries(rawPayload).filter(([_, v]) => v !== undefined)
    ) as Omit<Appointment, "id">;

    setIsSaving(true);
    try {
      if (isEdit && appointment) {
        await agendaService.updateAppointment(appointment.id, safePayload);
        toast({ title: "Cita actualizada" });
      } else {
        await agendaService.createAppointment(safePayload);
        toast({ title: "Cita agendada" });
      }
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast({ title: "Error al guardar la cita", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const isTemporalRegistration = hasSearched && searchResults.length === 0 && !selectedVehicle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 border-0 shadow-2xl rounded-xl">
        
        {/* Header */}
        <div className="bg-primary/5 px-6 py-5 border-b border-primary/10">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
            {isEdit ? "Editar Cita Programada" : "Registrar Nueva Cita"}
          </DialogTitle>
          <DialogDescription className="mt-1">
            Completa los detalles esenciales para programar el servicio. Todo debe ser breve y claro.
          </DialogDescription>
        </div>

        <div className="px-6 py-5 space-y-6">
          
          {/* VEHICLE SEARCH SECTION */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <Car className="h-4 w-4 text-primary" /> Vehículo (Placa)
            </Label>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Escribe al menos 4 letras/números..."
                  value={plateQuery}
                  onChange={(e) => {
                    setPlateQuery(e.target.value.toUpperCase());
                    setHasSearched(false);
                    setSelectedVehicle(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="font-mono text-base uppercase pl-10 h-11"
                  maxLength={10}
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Button type="button" onClick={handleSearch} disabled={isSearching || plateQuery.length < 4} variant="default" className="h-11">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
              </Button>
            </div>

            {/* Results Grid */}
            {searchResults.length > 0 && !selectedVehicle && (
              <div className="border rounded-lg bg-card shadow-sm divide-y max-h-48 overflow-y-auto mt-2">
                {searchResults.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleSelectVehicle(v)}
                    className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Car className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-sm">{v.licensePlate}</p>
                        <p className="text-xs text-muted-foreground">{v.make} {v.model} {v.year}</p>
                      </div>
                    </div>
                    <Check className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {/* Temporary Vehicle Form Fallback */}
            {isTemporalRegistration && (
              <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-200 mt-2 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-sm font-medium text-amber-900">
                    No se encontró la placa. Registre los datos base del vehículo para continuar. Esta no será una alta completa en el inventario.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-amber-900/80">Marca</Label>
                    <Input className="h-9 text-sm bg-white" placeholder="Ej: Nissan" value={tempMake} onChange={e => setTempMake(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-amber-900/80">Modelo</Label>
                    <Input className="h-9 text-sm bg-white" placeholder="Ej: Sentra" value={tempModel} onChange={e => setTempModel(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-amber-900/80">Año</Label>
                    <Input className="h-9 text-sm bg-white" placeholder="Ej: 2018" value={tempYear} onChange={e => setTempYear(e.target.value)} maxLength={4} />
                  </div>
                </div>
              </div>
            )}

            {/* Selected Vehicle Overview */}
            {selectedVehicle && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 mt-2 animate-in fade-in zoom-in-95 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-emerald-600" />
                    <span className="font-bold font-mono text-emerald-900">{selectedVehicle.licensePlate}</span>
                  </div>
                  <span className="text-xs text-emerald-700/80 mt-0.5 block">
                    {selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.year}
                  </span>
                </div>
                {loadingQuotes ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                ) : prevQuotes.length > 0 ? (
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                    {prevQuotes.length} Cotización(es)
                  </Badge>
                ) : null}
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* TIME & STATUS SECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 text-primary" /> Fecha
              </Label>
              <Input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="h-11 cursor-pointer"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" /> Turno
              </Label>
              <Select value={timeStr} onValueChange={setTimeStr}>
                <SelectTrigger className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((t) => (
                    <SelectItem key={t} value={t} className="font-medium">{t} hrs</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Appointment["status"])}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SERVICE TYPES SECTION */}
          {serviceTypes.length > 0 && (
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-semibold">Tipos de Servicio Requerido</Label>
              <div className="flex flex-wrap gap-2">
                {serviceTypes.map((t) => {
                  const isSelected = selectedServiceTypes.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleServiceType(t)}
                      className={cn(
                        "text-xs px-3.5 py-1.5 rounded-full border transition-all font-medium select-none",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20 ring-offset-1"
                          : "bg-background border-border hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-muted/40 px-6 py-4 flex items-center justify-end gap-3 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-muted">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="min-w-[140px] shadow-sm">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
            {isEdit ? "Guardar Cambios" : "Agendar Cita"}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
