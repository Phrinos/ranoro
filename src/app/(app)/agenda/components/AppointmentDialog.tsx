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
import { Loader2, Search, Car, FileText, Check, CalendarIcon, Clock, AlertCircle, Edit3, User as UserIcon, Phone, Tag, XCircle } from "lucide-react";
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
  defaultTime?: string;
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
  defaultTime = "08:30",
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
  const [tempName, setTempName] = useState("");
  const [tempPhone, setTempPhone] = useState("");

  // Form fields
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState<string>("08:30");
  const [status, setStatus] = useState<Appointment["status"]>("Pendiente");
  const [singleServiceType, setSingleServiceType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("none");
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
        setSingleServiceType(appointment.serviceTypeLabels?.[0] || "");
        setNotes(appointment.notes || "");
        setSelectedQuoteId(appointment.relatedQuoteId || "none");
        
        // Auto-select true vehicle if ID is not "temporal"
        if (appointment.vehicleId && appointment.vehicleId !== "temporal") {
          inventoryService.getVehicleById(appointment.vehicleId).then((v) => {
            if (v) {
              setSelectedVehicle(v);
              agendaService.getQuotesForVehicle(v.id).then(setPrevQuotes);
            }
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
        setTimeStr(defaultTime);
        setStatus("Pendiente");
        setSingleServiceType("");
        setNotes("");
        setSelectedQuoteId("none");
        setTempMake("");
        setTempModel("");
        setTempYear("");
        setTempName("");
        setTempPhone("");
      }
    }
  }, [open, appointment, selectedDate, defaultTime]);

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

  // Handle Search
  const handleSearch = useCallback(async (isManual = false) => {
    const q = plateQuery.trim().toUpperCase();
    if (q.length < 3) {
      if (isManual) toast({ title: "Ingresa al menos 3 caracteres de la placa" });
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
  }, [plateQuery, handleSelectVehicle, toast]);

  // Auto-search effect
  useEffect(() => {
    const q = plateQuery.trim().toUpperCase();
    if (q.length >= 4 && !selectedVehicle && !hasSearched) {
      const timer = setTimeout(() => {
        handleSearch(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [plateQuery, selectedVehicle, hasSearched, handleSearch]);





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
      ownerName: selectedVehicle?.ownerName || tempName || undefined,
      ownerPhone: selectedVehicle?.ownerPhone || tempPhone || undefined,
      appointmentDateTime: isoDateTime,
      status,
      notes: notes.trim() || undefined,
      serviceTypeLabels: singleServiceType ? [singleServiceType] : undefined,
    };

    if (selectedQuoteId !== "none") {
      rawPayload.relatedQuoteId = selectedQuoteId;
    } else if (prevQuotes.length > 0 && !isEdit) {
      // Auto assign first if not selected but exists
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
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden p-0 border-0 shadow-2xl rounded-2xl flex flex-col bg-slate-50">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
          <div>
            <DialogTitle className="text-xl font-black flex items-center gap-2.5 text-slate-800">
              <div className="bg-primary/10 p-2 rounded-xl">
                 <CalendarIcon className="h-5 w-5 text-primary" />
              </div>
              {isEdit ? "Editar Cita Programada" : "Registrar Nueva Cita"}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-500 mt-1 ml-12">
              Gestión de citas y autorización inicial.
            </DialogDescription>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-6 space-y-6">
          
          {/* LINEA 1: Logística (Fecha, Hora, Estado) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-5">
             <div className="space-y-2">
               <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <CalendarIcon className="h-3.5 w-3.5 text-primary" /> Fecha Programada
               </Label>
               <Input
                 type="date"
                 value={dateStr}
                 onChange={(e) => setDateStr(e.target.value)}
                 className="h-12 rounded-xl bg-slate-50 border-slate-200 cursor-pointer font-bold text-slate-700"
               />
             </div>
             
             <div className="space-y-2">
               <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <Clock className="h-3.5 w-3.5 text-primary" /> Turno
               </Label>
               <Select value={timeStr} onValueChange={setTimeStr}>
                 <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {TIME_SLOTS.map((t) => (
                     <SelectItem key={t} value={t} className="font-bold">{t} hrs</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>

             <div className="space-y-2">
               <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</Label>
               <Select value={status} onValueChange={(v) => setStatus(v as Appointment["status"])}>
                 <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-700">
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {STATUS_OPTIONS.map((s) => (
                     <SelectItem key={s} value={s} className="font-semibold">{s}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
          </div>

          {/* LINEA 2: Auto (Izquierda) y Cotización/Servicio (Derecha) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
             
             {/* Columna Izquierda (Vehículo) */}
             <div className="space-y-4">
               {/* Vehicle Search */}
               {!selectedVehicle && (
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" /> Buscar Vehículo
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Placas (ej. DZT59)..."
                        value={plateQuery}
                        onChange={(e) => {
                          setPlateQuery(e.target.value.toUpperCase());
                          setHasSearched(false);
                          setSelectedVehicle(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch(true)}
                        className="font-mono font-bold text-lg uppercase pl-12 h-14 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-primary/20"
                        maxLength={10}
                      />
                      <Car className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    </div>
                    <Button type="button" onClick={() => handleSearch(true)} disabled={isSearching || plateQuery.length < 3} className="h-14 px-6 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-white shadow-md">
                      {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Buscar"}
                    </Button>
                  </div>

                  {/* Results List */}
                  {searchResults.length > 0 && (
                    <div className="border border-slate-200 rounded-xl bg-white shadow-lg shadow-slate-200/50 divide-y divide-slate-100 max-h-48 overflow-y-auto mt-2">
                      {searchResults.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectVehicle(v)}
                          className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Car className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-mono font-black text-slate-800 text-base leading-none">{v.licensePlate}</p>
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">{v.make} {v.model} {v.year}</p>
                            </div>
                          </div>
                          <Check className="h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}
                 </div>
               )}

               {/* Selected Vehicle Info */}
               {selectedVehicle && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center gap-4 shadow-sm animate-in fade-in zoom-in-95">
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-100 shadow-xs shrink-0">
                    <Car className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Vehículo Seleccionado</p>
                    <div className="flex items-end gap-2">
                      <p className="font-mono font-black text-xl text-emerald-900 leading-none">{selectedVehicle.licensePlate}</p>
                      <p className="text-xs font-bold text-emerald-700 pb-0.5">{selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.year}</p>
                    </div>
                  </div>
                  {(selectedVehicle.ownerName || selectedVehicle.ownerPhone) && (
                     <div className="border-l border-emerald-200 pl-4 ml-2 mr-2 hidden sm:block">
                        <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Propietario</p>
                        <p className="font-bold text-sm text-emerald-900 truncate max-w-[120px]">{selectedVehicle.ownerName}</p>
                     </div>
                  )}
                  {/* Deselect / Edit button */}
                  <div className="border-l border-emerald-200 pl-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 text-emerald-700 hover:bg-emerald-100/50 hover:text-emerald-900 transition-colors" 
                      onClick={() => { setSelectedVehicle(null); setHasSearched(false); }} 
                      title="Cambiar Vehículo"
                    >
                      <XCircle className="h-5 w-5" />
                    </Button>
                  </div>
                 </div>
               )}

               {/* Temporary Registration Form */}
               {isTemporalRegistration && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 space-y-4 animate-in fade-in zoom-in-95">
                  <div className="flex items-center gap-2 border-b border-amber-200/50 pb-3">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <p className="text-sm font-bold text-amber-900">Vehículo no encontrado. Ingresa los datos iniciales.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-amber-800/70 uppercase tracking-widest">Marca</Label>
                      <Input className="h-10 bg-white border-amber-200/50" placeholder="Ej. Nissan" value={tempMake} onChange={e => setTempMake(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-amber-800/70 uppercase tracking-widest">Modelo</Label>
                      <Input className="h-10 bg-white border-amber-200/50" placeholder="Ej. Sentra" value={tempModel} onChange={e => setTempModel(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-amber-800/70 uppercase tracking-widest">Año</Label>
                      <Input className="h-10 bg-white border-amber-200/50" placeholder="Ej. 2018" value={tempYear} onChange={e => setTempYear(e.target.value)} maxLength={4} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-amber-800/70 uppercase tracking-widest flex items-center gap-1.5"><UserIcon className="h-3 w-3" /> Nombre de Cliente</Label>
                      <Input className="h-10 bg-white border-amber-200/50" placeholder="Nombre completo" value={tempName} onChange={e => setTempName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-amber-800/70 uppercase tracking-widest flex items-center gap-1.5"><Phone className="h-3 w-3" /> Teléfono</Label>
                      <Input className="h-10 bg-white border-amber-200/50" placeholder="10 dígitos" value={tempPhone} onChange={e => setTempPhone(e.target.value)} />
                    </div>
                  </div>
                 </div>
               )}
             </div>

             {/* Columna Derecha (Cotización y Categoría) */}
             <div className="space-y-4">
               {/* Quotes Section */}
               <div className="bg-white rounded-2xl border border-amber-200/60 p-5 shadow-xs">
                 <Label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2 mb-3">
                   <FileText className="h-3.5 w-3.5" /> Cotización Vinculada
                 </Label>
                 {loadingQuotes ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium h-12">
                       <Loader2 className="h-4 w-4 animate-spin" /> Cargando cotizaciones...
                    </div>
                 ) : prevQuotes.length > 0 ? (
                    <Select value={selectedQuoteId} onValueChange={setSelectedQuoteId}>
                       <SelectTrigger className="h-[3.25rem] bg-white border-amber-200 rounded-xl text-left">
                          <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                          <SelectItem value="none" className="italic font-medium text-slate-500">Ninguna cotización vinculada</SelectItem>
                          {prevQuotes.map(q => {
                              const dateObj = q.createdAt?.seconds 
                                ? new Date(q.createdAt.seconds * 1000) 
                                : (q.createdAt ? new Date(q.createdAt) : null);
                              return (
                                 <SelectItem key={q.id} value={q.id} className="py-2">
                                    <div className="flex flex-col gap-0.5">
                                      <span className="font-bold text-slate-800">
                                        Folio: {q.folio || q.id.slice(0,6)} <span className="text-amber-600 ml-1">{q.totalAmount ? `$${q.totalAmount}` : ''}</span>
                                      </span>
                                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                                        {dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString("es-MX") : "Sin fecha"} • {q.description || q.serviceTypeLabel || "Servicio General"}
                                      </span>
                                    </div>
                                 </SelectItem>
                              );
                           })}
                       </SelectContent>
                    </Select>
                 ) : (
                    <p className="text-xs font-semibold text-slate-400 italic">No hay cotizaciones para este vehículo.</p>
                 )}
               </div>

               {/* Categoría de Servicio */}
               <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                     <Tag className="h-3.5 w-3.5 text-primary" /> Categoría de Servicio
                  </Label>
                       <Select value={singleServiceType} onValueChange={setSingleServiceType}>
                          <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-semibold text-slate-700">
                             <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                             {serviceTypes.map((t) => (
                               <SelectItem key={t} value={t} className="font-medium">{t}</SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
               </div>
             </div>
          </div>

          {/* LINEA 3: Notas y Botones */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
               <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Edit3 className="h-3.5 w-3.5 text-primary" /> ¿Qué se le hará? (Notas)
               </Label>
               <textarea 
                  className="w-full h-24 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20 resize-none transition-all"
                  placeholder="Describe brevemente el problema reportado o el servicio solicitado..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
               />
            </div>
            
            <div className="flex flex-col justify-end gap-3 pb-2">
              <Button onClick={handleSave} disabled={isSaving} className="h-14 rounded-xl font-black text-white shadow-lg bg-linear-to-b from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all active:scale-[0.98] text-base">
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 mr-2" />}
                {isEdit ? "Guardar Cambios" : "Agendar Cita"}
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-12 rounded-xl font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50">
                Cancelar
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
