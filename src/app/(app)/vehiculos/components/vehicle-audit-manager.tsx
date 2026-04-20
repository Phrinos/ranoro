"use client";

import React, { useMemo, useState } from 'react';
import type { Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import {
  AlertTriangle, Check, Car, Phone,
  Wrench, Edit2, Trash2,
  SearchX, CopyMinus, UserX, ShieldQuestion, CalendarX
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VehicleAuditManagerProps {
  vehicles: Vehicle[];
  permissions: any;
  onEdit: (v: Vehicle) => void;
  onDelete: (id: string) => void;
}

function getServiceData(v: Vehicle) {
  if (!v.lastServiceDate) return { label: 'Sin registros', color: 'text-slate-400' };
  const d = parseDate(v.lastServiceDate);
  if (!d) return { label: 'Sin registros', color: 'text-slate-400' };
  const str = format(d, 'dd MMM yyyy', { locale: es });
  const days = differenceInDays(new Date(), d);
  let color = 'text-green-600';
  if (days > 90) color = 'text-amber-600';
  if (days > 180) color = 'text-red-500';
  return { label: `${str} (hace ${days}d)`, color };
}

export function VehicleAuditManager({ vehicles, permissions, onEdit, onDelete }: VehicleAuditManagerProps) {
  const [activeTab, setActiveTab] = useState<"duplicados" | "incompletos" | "sin-servicios">("duplicados");

  // ── Duplicate Analysis ──────────────────────────────────────────────
  const duplicateGroups = useMemo(() => {
    const map = new Map<string, Vehicle[]>();
    vehicles.forEach(v => {
      const plate = (v.licensePlate || '').trim().toUpperCase();
      if (!plate) return;
      if (!map.has(plate)) map.set(plate, []);
      map.get(plate)!.push(v);
    });

    const groups: { plate: string; vehicles: Vehicle[] }[] = [];
    map.forEach((list, plate) => {
      if (list.length > 1) {
        list.sort((a, b) => {
          const dateA = a.lastServiceDate ? parseDate(a.lastServiceDate)?.getTime() || 0 : 0;
          const dateB = b.lastServiceDate ? parseDate(b.lastServiceDate)?.getTime() || 0 : 0;
          return dateB - dateA;
        });
        groups.push({ plate, vehicles: list });
      }
    });
    return groups.sort((a, b) => b.vehicles.length - a.vehicles.length);
  }, [vehicles]);

  // ── Incomplete Analysis ─────────────────────────────────────────────
  const incompleteVehicles = useMemo(() => {
    return vehicles.map(v => {
      const issues: string[] = [];
      if (!v.make || v.make.trim() === '') issues.push("Falta Marca");
      if (!v.model || v.model.trim() === '') issues.push("Falta Modelo");
      if (!v.ownerName || v.ownerName.trim() === '') issues.push("Sin Propietario Asignado");
      if (!v.ownerPhone || v.ownerPhone.trim() === '') issues.push("Falta Teléfono");
      return { vehicle: v, issues };
    }).filter(item => item.issues.length > 0)
      .sort((a, b) => b.issues.length - a.issues.length);
  }, [vehicles]);

  // ── No Services Analysis ────────────────────────────────────────────
  const abandonedVehicles = useMemo(() => {
    return vehicles.filter(v => !v.lastServiceDate).sort((a, b) => {
      return (a.ownerName || '').localeCompare(b.ownerName || '');
    });
  }, [vehicles]);

  const tabs = [
    {
      id: 'duplicados' as const,
      label: 'Placas Duplicadas',
      icon: CopyMinus,
      count: duplicateGroups.length,
      activeClass: 'bg-white text-purple-700 shadow-xs border border-purple-200',
      countClass: 'bg-purple-100 text-purple-700',
    },
    {
      id: 'incompletos' as const,
      label: 'Datos Faltantes',
      icon: SearchX,
      count: incompleteVehicles.length,
      activeClass: 'bg-white text-amber-700 shadow-xs border border-amber-200',
      countClass: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'sin-servicios' as const,
      label: 'Sin Servicios',
      icon: CalendarX,
      count: abandonedVehicles.length,
      activeClass: 'bg-white text-slate-700 shadow-xs border border-slate-200',
      countClass: 'bg-slate-200 text-slate-700',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Banner */}
      <Card className="bg-linear-to-r from-slate-900 to-slate-800 text-white border-none shadow-md overflow-hidden relative">
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <CardContent className="p-6 md:p-8 relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <ShieldQuestion className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-bold uppercase tracking-widest text-purple-200">Motor de Inteligencia de Datos</span>
            </div>
            <h2 className="text-2xl font-black text-white">Auditoría del Directorio</h2>
            <p className="text-slate-300 text-sm max-w-xl">
              Detecta expedientes duplicados y perfiles con datos críticos faltantes para mantener tu operación impecable.
            </p>
          </div>
          <div className="flex gap-4 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] border border-white/5">
              <span className="text-3xl font-black text-purple-400">{duplicateGroups.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Placas Clónicas</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] border border-white/5">
              <span className="text-3xl font-black text-amber-400">{incompleteVehicles.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Incompletos</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] border border-white/5">
              <span className="text-3xl font-black text-slate-300">{abandonedVehicles.length}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">Sin Citas</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pill Tab Navigation */}
      <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2",
                isActive ? tab.activeClass : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-black",
                isActive ? tab.countClass : "bg-slate-200 text-slate-500"
              )}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab: Duplicados */}
      {activeTab === 'duplicados' && (
        <div className="space-y-6">
          {duplicateGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Cero Placas Duplicadas</h3>
              <p className="text-slate-500 mt-2">Tu base de datos está libre de choques de placas identificadas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {duplicateGroups.map(group => (
                <Card key={group.plate} className="border-purple-100 shadow-xs overflow-hidden border-2">
                  <div className="bg-purple-50 border-b border-purple-100 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-xs border border-purple-200">
                        <CopyMinus className="h-5 w-5 text-purple-600" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-purple-900 leading-none mb-1">Conflicto Identificado</p>
                        <p className="text-2xl font-black text-slate-800 tracking-widest">{group.plate}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 py-1 px-3 pointer-events-none">
                      {group.vehicles.length} registros usan esta placa
                    </Badge>
                  </div>
                  <div className="p-4 bg-slate-50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {group.vehicles.map((v, idx) => {
                        const sd = getServiceData(v);
                        return (
                          <div key={v.id} className={cn("bg-white border rounded-xl p-4 shadow-xs flex flex-col relative", idx === 0 && "border-purple-300 ring-1 ring-purple-50")}>
                            {idx === 0 && (
                              <span className="absolute -top-3 -right-2 bg-purple-600 text-white text-[10px] uppercase font-bold py-0.5 px-2 rounded-full shadow-sm border-2 border-white pointer-events-none">
                                Perfil Más Activo
                              </span>
                            )}
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <p className="font-bold text-slate-800 text-lg leading-tight">{v.make || 'Sin Marca'} {v.model}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {v.id}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button size="icon" variant="outline" className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" onClick={() => onEdit(v)}>
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                {permissions.has('vehicles:delete') && (
                                  <Button size="icon" variant="outline" className="h-8 w-8 hover:bg-red-50 hover:text-red-600 hover:border-red-200" onClick={() => onDelete(v.id)}>
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm flex-1">
                              <div>
                                <p className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider flex items-center gap-1">
                                  <UserX className="w-3 h-3" /> Dueño
                                </p>
                                <p className="font-medium text-slate-700 truncate">
                                  {v.ownerName || <span className="italic text-slate-400">Desconocido</span>}
                                </p>
                                {v.ownerPhone && <p className="text-xs text-slate-500 font-mono mt-0.5">{v.ownerPhone}</p>}
                              </div>
                              <div>
                                <p className="text-[10px] uppercase text-slate-500 font-semibold tracking-wider flex items-center gap-1">
                                  <Wrench className="w-3 h-3" /> Último Servicio
                                </p>
                                <p className={cn("font-medium", sd.color)}>{sd.label}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg text-sm text-purple-800 flex gap-3">
                      <AlertTriangle className="w-5 h-5 shrink-0 opacity-70" />
                      <p>
                        <strong>Resolución recomendada:</strong> Compara los dueños y el historial de servicios. Conserva el registro más verídico y elimina los duplicados.
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Incompletos */}
      {activeTab === 'incompletos' && (
        <div className="space-y-6">
          {incompleteVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Calidad de Datos Perfecta</h3>
              <p className="text-slate-500 mt-2">Todos tus registros tienen Marca, Modelo y Propietario vigentes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {incompleteVehicles.map(({ vehicle: v, issues }) => (
                <Card key={v.id} className="border-amber-100 shadow-xs hover:shadow-sm transition-shadow flex flex-col">
                  <CardHeader className="p-4 pb-2 border-b bg-amber-50/50 flex flex-row items-center justify-between space-y-0 relative">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                        <Car className="w-4 h-4 text-slate-400" />
                        {v.licensePlate || <span className="italic text-slate-400 font-normal text-sm">Sin Placa</span>}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">ID: {v.id.slice(-6)}</CardDescription>
                    </div>
                    <div className="absolute right-4 top-4">
                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-amber-100 hover:text-amber-700" onClick={() => onEdit(v)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex-1 flex flex-col bg-white">
                    {v.ownerName && (
                      <div className="mb-4">
                        <p className="text-[10px] uppercase text-slate-500 font-bold">A Nombre de:</p>
                        <p className="text-sm font-medium">
                          {v.ownerName}
                          {v.ownerPhone && <span className="text-xs text-muted-foreground ml-1">({v.ownerPhone})</span>}
                        </p>
                      </div>
                    )}
                    <div className="mt-auto space-y-2 border-t pt-3">
                      <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <SearchX className="w-3.5 h-3.5" /> Detectado:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {issues.map(issue => (
                          <Badge key={issue} variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                            {issue}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Sin Servicios */}
      {activeTab === 'sin-servicios' && (
        <div className="space-y-6">
          {abandonedVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Cero Coches Sin Servicios</h3>
              <p className="text-slate-500 mt-2">Todos los coches registrados tienen por lo menos un servicio documentado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {abandonedVehicles.map(v => (
                <Card key={v.id} className="border-slate-200 shadow-xs hover:shadow-sm transition-shadow flex flex-col">
                  <CardHeader className="p-4 pb-2 border-b bg-slate-50 flex flex-row items-center justify-between space-y-0 relative">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                        <Car className="w-4 h-4 text-slate-400" />
                        {v.licensePlate || <span className="italic text-slate-400 font-normal text-sm">Sin Placa</span>}
                      </CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">
                        {v.make || 'Sin Marca'} {v.model} {v.year ? `· ${v.year}` : ''}
                      </CardDescription>
                    </div>
                    <div className="absolute right-4 top-4">
                      <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-200 hover:text-slate-700" onClick={() => onEdit(v)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 flex-1 flex flex-col bg-white">
                    {v.ownerName && (
                      <div className="mb-4">
                        <p className="text-[10px] uppercase text-slate-500 font-bold">A Nombre de:</p>
                        <p className="text-sm font-medium">
                          {v.ownerName}
                          {v.ownerPhone && <span className="text-xs text-muted-foreground ml-1">({v.ownerPhone})</span>}
                        </p>
                      </div>
                    )}
                    <div className="mt-auto space-y-2 border-t pt-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <CalendarX className="w-3.5 h-3.5" /> Estado Cero
                      </p>
                      <p className="text-sm text-slate-600">Este vehículo no tiene ningún servicio completado en el historial.</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
