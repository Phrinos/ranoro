// src/app/(app)/vehiculos/components/vehicles-table.tsx
"use client";

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import type { Vehicle } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronLeft, ChevronRight, Search, X, AlertTriangle,
  Car, Phone, Clock, ArrowUpDown, CheckCircle2, PlusCircle,
  MoreHorizontal, Eye, Pencil, Trash2,
} from 'lucide-react';
import { format, isValid, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { useRouter } from 'next/navigation';
import { inventoryService } from '@/lib/services';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';

interface VehiclesTableProps {
  vehicles: Vehicle[];
  systemStats: any;
  permissions: any;
  onSave: (data: any, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAdd: () => void;
  onEdit?: (vehicle: Vehicle) => void;
}

const MIN_SEARCH = 4;
const PAGE_SIZE = 25;

type QuickFilter = 'all' | 'recientes' | 'vencidos' | 'sin-contacto' | 'duplicados' | 'incompletos';
type SortKey = 'licensePlate' | 'make' | 'year' | 'ownerName' | 'lastServiceDate';
type SortDir = 'asc' | 'desc';

const QUICK_FILTERS: { id: QuickFilter; label: string }[] = [
  { id: 'all',          label: 'Todos' },
  { id: 'recientes',    label: '← 60 días' },
  { id: 'vencidos',     label: '+6 meses sin visita' },
  { id: 'sin-contacto', label: 'Sin contacto' },
  { id: 'duplicados',   label: 'Duplicados' },
  { id: 'incompletos',  label: 'Datos faltantes' },
];

function daysSinceService(v: Vehicle): number | null {
  if (!v.lastServiceDate) return null;
  const d = parseDate(v.lastServiceDate);
  if (!d || !isValid(d)) return null;
  return differenceInDays(new Date(), d);
}

function getServiceLabel(v: Vehicle): string {
  if (!v.lastServiceDate) return '—';
  const d = parseDate(v.lastServiceDate);
  if (!d || !isValid(d)) return '—';
  return format(d, 'dd MMM yyyy', { locale: es });
}

function getServiceColor(days: number | null): string {
  if (days === null) return 'text-slate-400';
  if (days <= 60) return 'text-emerald-700 font-semibold';
  if (days <= 180) return 'text-amber-600';
  return 'text-red-600 font-bold';
}

export function VehiclesTable({ vehicles, systemStats, permissions, onAdd, onDelete, onEdit }: VehiclesTableProps) {
  const router = useRouter();

  // ── Search ─────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [remoteResults, setRemoteResults] = useState<Vehicle[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const isSearchActive = searchTerm.trim().length >= MIN_SEARCH;

  useEffect(() => {
    const q = searchTerm.trim();
    if (q.length < MIN_SEARCH) { setRemoteResults([]); return; }
    setIsSearching(true);
    const t = setTimeout(async () => {
      try { setRemoteResults(await inventoryService.searchVehicles(q)); }
      catch { setRemoteResults([]); }
      finally { setIsSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const mergedVehicles = useMemo(() => {
    if (remoteResults.length === 0) return vehicles;
    const map = new Map<string, Vehicle>();
    vehicles.forEach(v => map.set(v.id, v));
    remoteResults.forEach(v => map.set(v.id, v));
    return Array.from(map.values());
  }, [vehicles, remoteResults]);

  // ── Filters ─────────────────────────────────────────────
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [filterMake, setFilterMake] = useState('all');
  const [filterModel, setFilterModel] = useState('all');

  const makes = useMemo(() =>
    Array.from(new Set(vehicles.map(v => v.make).filter(Boolean))).sort(),
  [vehicles]);

  const models = useMemo(() =>
    Array.from(new Set(
      vehicles
        .filter(v => filterMake === 'all' || v.make === filterMake)
        .map(v => v.model).filter(Boolean)
    )).sort(),
  [vehicles, filterMake]);

  // ── Duplicate detection ─────────────────────────────────
  const duplicateIds = useMemo(() => {
    const counts = new Map<string, string[]>();
    vehicles.forEach(v => {
      const p = (v.licensePlate || '').trim().toUpperCase();
      if (p) counts.set(p, [...(counts.get(p) ?? []), v.id]);
    });
    const ids = new Set<string>();
    counts.forEach(list => { if (list.length > 1) list.forEach(id => ids.add(id)); });
    return ids;
  }, [vehicles]);

  // ── Sort ───────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>('lastServiceDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // ── Pagination ─────────────────────────────────────────
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [searchTerm, quickFilter, filterMake, filterModel, sortKey, sortDir]);

  // ── Filtered + sorted list ─────────────────────────────
  const filteredVehicles = useMemo(() => {
    let data = isSearchActive ? mergedVehicles : vehicles;

    if (quickFilter !== 'all') {
      data = data.filter(v => {
        const days = daysSinceService(v);
        switch (quickFilter) {
          case 'recientes':    return days !== null && days <= 60;
          case 'vencidos':     return days === null || days > 180;
          case 'sin-contacto': return !v.ownerName || !v.ownerPhone;
          case 'duplicados':   return duplicateIds.has(v.id);
          case 'incompletos':  return !v.make || !v.model || v.make.trim() === '' || v.model.trim() === '';
        }
        return true;
      });
    }

    if (filterMake !== 'all') data = data.filter(v => v.make === filterMake);
    if (filterModel !== 'all') data = data.filter(v => v.model === filterModel);

    if (isSearchActive) {
      const q = searchTerm.trim().toLowerCase();
      data = data.filter(v =>
        [v.licensePlate, v.make, v.model, String(v.year), v.ownerName, v.ownerPhone, v.id]
          .some(f => (f ?? '').toLowerCase().includes(q))
      );
    }

    return [...data].sort((a, b) => {
      if (sortKey === 'lastServiceDate') {
        const da = a.lastServiceDate ? parseDate(a.lastServiceDate) : null;
        const db = b.lastServiceDate ? parseDate(b.lastServiceDate) : null;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return sortDir === 'asc' ? da.getTime() - db.getTime() : db.getTime() - da.getTime();
      }
      const va = (a as any)[sortKey] ?? '';
      const vb = (b as any)[sortKey] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' })
        : String(vb).localeCompare(String(va), 'es', { sensitivity: 'base' });
    });
  }, [vehicles, mergedVehicles, isSearchActive, searchTerm, quickFilter, filterMake, filterModel, duplicateIds, sortKey, sortDir]);

  const totalPages = Math.ceil(filteredVehicles.length / PAGE_SIZE);
  const pageData = filteredVehicles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── KPI stats ────────────────────────────────────────
  const kpis = useMemo(() => {
    if (systemStats) return {
      total: systemStats.total || vehicles.length,
      recientes: systemStats.recientes || 0,
      vencidos: systemStats.vencidos || 0,
      sinContacto: systemStats.sinContacto || 0,
      dups: systemStats.dups || 0,
    };
    return {
      total: vehicles.length,
      recientes: vehicles.filter(v => { const d = daysSinceService(v); return d !== null && d <= 60; }).length,
      vencidos: vehicles.filter(v => { const d = daysSinceService(v); return d === null || d > 180; }).length,
      sinContacto: vehicles.filter(v => !v.ownerName || !v.ownerPhone).length,
      dups: vehicles.filter(v => duplicateIds.has(v.id)).length,
    };
  }, [vehicles, systemStats, duplicateIds]);

  // ── Sort header component ─────────────────────────────
  const SortHeader = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <TableHead
      className={cn("cursor-pointer select-none whitespace-nowrap text-muted-foreground text-xs font-bold uppercase tracking-widest hover:text-foreground transition-colors", className)}
      onClick={() => handleSort(k)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        <ArrowUpDown className={cn("h-3 w-3 opacity-40 transition-opacity", sortKey === k && "opacity-100 text-primary")} />
        {sortKey === k && <span className="text-[10px] text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </div>
    </TableHead>
  );

  const hasActiveFilters = quickFilter !== 'all' || filterMake !== 'all' || filterModel !== 'all' || searchTerm.length > 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-500">

      {/* ── KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Vehículos', value: kpis.total,       icon: Car,          cls: 'text-slate-700  bg-slate-50  border-slate-200',  onClick: () => setQuickFilter('all') },
          { label: 'Activos 60 días',  value: kpis.recientes,  icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', onClick: () => setQuickFilter('recientes') },
          { label: 'Sin visita +6m',   value: kpis.vencidos,   icon: Clock,        cls: 'text-red-700    bg-red-50    border-red-200',      onClick: () => setQuickFilter('vencidos') },
          { label: 'Sin contacto',     value: kpis.sinContacto,icon: Phone,        cls: 'text-amber-700  bg-amber-50  border-amber-200',    onClick: () => setQuickFilter('sin-contacto') },
        ].map(({ label, value, icon: Icon, cls, onClick }) => (
          <Card
            key={label}
            className={cn("cursor-pointer transition-all hover:scale-[1.02] shadow-xs border", cls)}
            onClick={onClick}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="shrink-0 rounded-xl bg-white/60 p-2 shadow-xs">
                <Icon className="h-5 w-5 opacity-80" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-black leading-none">{value}</p>
                <p className="text-[10px] font-semibold opacity-70 uppercase tracking-wider mt-1">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Controls Row ─────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Line 1: Selectors + Search + New Vehicle button */}
        <div className="flex flex-col xl:flex-row gap-2 items-stretch xl:items-center">

          {/* Make selector */}
          <Select value={filterMake} onValueChange={v => { setFilterMake(v); setFilterModel('all'); }}>
            <SelectTrigger className="h-10 w-full sm:w-44 bg-white shadow-xs border-slate-200 rounded-xl text-sm shrink-0">
              <SelectValue placeholder="Todas las Marcas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las Marcas</SelectItem>
              {makes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Model selector */}
          <Select value={filterModel} onValueChange={setFilterModel} disabled={filterMake === 'all'}>
            <SelectTrigger className="h-10 w-full sm:w-44 bg-white shadow-xs border-slate-200 rounded-xl text-sm shrink-0">
              <SelectValue placeholder="Todos los Modelos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Modelos</SelectItem>
              {models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Search bar */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Buscar por placa, nombre, modelo…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-10 pl-10 pr-9 bg-white shadow-xs border-slate-200 rounded-xl focus-visible:ring-primary/20"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* New Vehicle button */}
          {permissions.has('vehicles:manage') && (
            <Button onClick={onAdd} className="h-10 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-xs gap-2 font-bold shrink-0">
              <PlusCircle className="h-4 w-4" /> Nuevo Vehículo
            </Button>
          )}
        </div>

        {/* Line 2: Quick filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mr-2">Filtros:</span>
          {QUICK_FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setQuickFilter(id)}
              className={cn(
                "h-7 px-3.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap border uppercase tracking-wider",
                quickFilter === id
                  ? "bg-red-700 text-white border-red-700 shadow-xs"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
              )}
            >
              {label}
            </button>
          ))}
          {hasActiveFilters && (
            <button
              onClick={() => { setQuickFilter('all'); setFilterMake('all'); setFilterModel('all'); setSearchTerm(''); }}
              className="h-7 px-3.5 rounded-full border border-red-200 text-[10px] font-black text-red-600 bg-red-50 hover:bg-red-100 transition-all uppercase tracking-widest ml-1"
            >
              × Limpiar
            </button>
          )}
          {!isSearchActive && searchTerm.length > 0 && (
            <span className="text-xs text-amber-600 font-medium ml-2">Escribe {MIN_SEARCH} caracteres para buscar</span>
          )}
        </div>
      </div>

      {/* ── Table & Cards ────────────────────────────────────────── */}
      <div className="rounded-xl md:rounded-2xl overflow-hidden shadow-xs md:shadow-xl bg-white/50 backdrop-blur-xl border border-white/60">
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-none">
                <SortHeader k="licensePlate" label="Placa"   className="pl-5 w-[130px]" />
                <SortHeader k="make"         label="Vehículo" className="min-w-[220px]" />
                <SortHeader k="ownerName"    label="Propietario / Contacto" className="min-w-[200px]" />
                <SortHeader k="lastServiceDate" label="Último Servicio" className="text-right w-[160px]" />
                <TableHead className="w-[60px] pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length > 0 ? (
                pageData.map(v => {
                  const days = daysSinceService(v);
                  const isDup = duplicateIds.has(v.id);
                  const isIncomplete = !v.make || !v.model;

                  return (
                    <TableRow
                      key={v.id}
                      onClick={() => router.push(`/vehiculos/${v.id}`)}
                      className={cn(
                        "cursor-pointer transition-colors group border-slate-100",
                        isDup ? "bg-purple-50/50 hover:bg-purple-50" : "hover:bg-slate-50/80"
                      )}
                    >
                      <TableCell className="pl-5">
                        {v.licensePlate ? (
                          <span className={cn(
                            "font-mono font-black tracking-widest text-base",
                            isDup ? "text-purple-700" : "text-slate-800"
                          )}>
                            {v.licensePlate}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Sin placa</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-900 text-base leading-tight">
                            {[v.make, v.model, v.year && !isNaN(Number(v.year)) ? String(v.year) : null]
                              .filter(Boolean).join(' · ') || <span className="text-slate-400 italic font-normal text-sm">Sin datos</span>}
                          </span>
                          {isIncomplete && (
                            <span className="text-[10px] text-orange-600 font-bold uppercase flex items-center gap-1">
                              <AlertTriangle className="h-2.5 w-2.5" /> Datos incompletos
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-slate-900 text-sm leading-tight">
                            {v.ownerName || <span className="text-slate-400 italic font-normal">Sin nombre</span>}
                          </span>
                          {v.ownerPhone ? (
                            <span className="text-slate-500 text-xs flex items-center gap-1 font-mono">
                              <Phone className="h-2.5 w-2.5 shrink-0" /> {v.ownerPhone}
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-semibold">Sin contacto</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right pr-4">
                        <div className={cn("flex flex-col items-end", getServiceColor(days))}>
                          <span className="text-sm font-medium">{getServiceLabel(v)}</span>
                          {days !== null && (
                            <span className="text-[10px] font-semibold opacity-70 uppercase tracking-widest">
                              {days === 0 ? 'hoy' : `hace ${days}d`}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="pr-4 text-right" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 shadow-xs hover:bg-slate-50 transition-all rounded-full"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[180px] bg-white/95 backdrop-blur-xl shadow-xl border-white/40">
                            <DropdownMenuItem onClick={() => router.push(`/vehiculos/${v.id}`)} className="gap-2 cursor-pointer font-medium">
                              <Eye className="h-4 w-4 text-slate-500" /> Ver Vehículo
                            </DropdownMenuItem>
                            {onEdit && permissions.has('vehicles:manage') && (
                              <DropdownMenuItem onClick={() => onEdit(v)} className="gap-2 cursor-pointer font-medium">
                                <Pencil className="h-4 w-4 text-blue-500" /> Editar
                              </DropdownMenuItem>
                            )}
                            {permissions.has('vehicles:delete') && (
                              <>
                                <DropdownMenuSeparator />
                                <ConfirmDialog
                                  triggerButton={
                                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="gap-2 text-destructive focus:text-destructive focus:bg-red-50 cursor-pointer font-medium">
                                      <Trash2 className="h-4 w-4" /> Eliminar
                                    </DropdownMenuItem>
                                  }
                                  title={`¿Eliminar vehículo ${v.licensePlate || v.id.slice(-6)}?`}
                                  description="Esta acción es permanente y no se puede deshacer."
                                  onConfirm={() => onDelete(v.id)}
                                />
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                      <div className="bg-slate-100 p-5 rounded-full">
                         <Car className="h-10 w-10 text-slate-300" />
                      </div>
                      <p className="font-semibold text-slate-600 text-lg">No se encontraron vehículos</p>
                      {hasActiveFilters && (
                        <p className="text-sm">Prueba con otros filtros o limpia la búsqueda.</p>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden flex flex-col divide-y divide-slate-100">
          {pageData.length > 0 ? (
            pageData.map(v => {
              const days = daysSinceService(v);
              const isDup = duplicateIds.has(v.id);
              const isIncomplete = !v.make || !v.model;
              return (
                <div 
                  key={`mob-${v.id}`} 
                  onClick={() => router.push(`/vehiculos/${v.id}`)} 
                  className={cn("p-4 flex flex-col gap-3 cursor-pointer hover:bg-slate-50/50 transition-colors relative", isDup ? "bg-purple-50/30" : "bg-white/40")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className={cn("font-mono font-black text-lg tracking-widest", isDup ? "text-purple-700" : "text-slate-800")}>
                         {v.licensePlate || <span className="text-sm text-slate-400 italic">Sin placa</span>}
                      </span>
                      <span className="font-bold text-slate-900 text-[15px] leading-tight truncate">
                         {[v.make, v.model, v.year && !isNaN(Number(v.year)) ? String(v.year) : null]
                             .filter(Boolean).join(' · ') || <span className="text-slate-400 italic font-normal text-sm">Sin datos</span>}
                      </span>
                      {isIncomplete && (
                         <span className="text-[10px] sm:hidden text-orange-600 font-bold uppercase flex items-center gap-1 mt-0.5">
                           <AlertTriangle className="h-2.5 w-2.5" /> Faltan datos
                         </span>
                      )}
                    </div>
                    {/* Menu actions inside mobile card */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 w-8 shrink-0 text-slate-400"
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-white/95">
                        <DropdownMenuItem onClick={() => router.push(`/vehiculos/${v.id}`)}>
                          <Eye className="h-4 w-4 mr-2" /> Ver Vehículo
                        </DropdownMenuItem>
                        {onEdit && permissions.has('vehicles:manage') && (
                          <DropdownMenuItem onClick={() => onEdit(v)} className="text-blue-600">
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                        )}
                        {permissions.has('vehicles:delete') && (
                           <>
                              <DropdownMenuSeparator />
                              <ConfirmDialog
                                triggerButton={
                                  <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-600 focus:text-red-700">
                                    <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                                  </DropdownMenuItem>
                                }
                                title={`¿Eliminar vehículo ${v.licensePlate || v.id.slice(-6)}?`}
                                description="Esta acción es permanente."
                                onConfirm={() => onDelete(v.id)}
                              />
                           </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-end justify-between border-t border-slate-100 pt-3 mt-1">
                     <div className="flex flex-col min-w-0 pr-2">
                        <span className="font-semibold text-slate-800 text-[13px] truncate">
                          {v.ownerName || <span className="text-slate-400 italic font-normal">Sin propietario</span>}
                        </span>
                        {v.ownerPhone ? (
                          <span className="text-slate-500 text-[11px] flex items-center gap-1 font-mono">
                            <Phone className="h-3 w-3 shrink-0" /> {v.ownerPhone}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 font-semibold">Sin teléfono</span>
                        )}
                     </div>
                     <div className={cn("flex flex-col items-end shrink-0", getServiceColor(days))}>
                          <span className="text-xs font-bold">{getServiceLabel(v)}</span>
                          {days !== null && (
                            <span className="text-[9px] font-black opacity-80 uppercase tracking-widest">
                              {days === 0 ? 'hoy' : `hace ${days}d`}
                            </span>
                          )}
                     </div>
                  </div>
                </div>
              );
            })
          ) : (
             <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center">
                 <div className="bg-slate-100 p-4 rounded-full mb-3">
                   <Car className="h-8 w-8 text-slate-300" />
                 </div>
                 <p className="font-semibold text-slate-600">No se encontraron vehículos</p>
             </div>
          )}
        </div>

        {/* Pagination Footer */}
        {filteredVehicles.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-5 py-3">
            <p className="text-xs text-slate-500 font-medium">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredVehicles.length)} de {filteredVehicles.length} vehículos
            </p>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-7 w-7 p-0 rounded-lg bg-white" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-semibold px-2 text-slate-500">
                {page} / {Math.max(1, totalPages)}
              </span>
              <Button size="sm" variant="outline" className="h-7 w-7 p-0 rounded-lg bg-white" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
