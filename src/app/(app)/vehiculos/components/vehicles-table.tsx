// src/app/(app)/vehiculos/components/vehicles-table.tsx
"use client";

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import type { Vehicle } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronLeft, ChevronRight, Loader2, Search, X, AlertTriangle,
  Car, Phone, Clock, ArrowUpDown, CheckCircle2, CopyX, PlusCircle, MoreHorizontal
} from 'lucide-react';
import { format, isValid, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { useRouter } from 'next/navigation';
import { inventoryService } from '@/lib/services';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface VehiclesTableProps {
  vehicles: Vehicle[];
  systemStats: any;
  permissions: any;
  onSave: (data: any, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAdd: () => void;
}

const MIN_SEARCH = 4;
const PAGE_SIZE = 25;

type QuickFilter = 'all' | 'recientes' | 'vencidos' | 'sin-contacto' | 'duplicados';
type SortKey = 'id' | 'licensePlate' | 'make' | 'year' | 'ownerName' | 'lastServiceDate';
type SortDir = 'asc' | 'desc';

const QUICK_FILTERS: { id: QuickFilter; label: string; color: string }[] = [
  { id: 'all',          label: 'Todos',              color: '' },
  { id: 'recientes',    label: '← 60 días',           color: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' },
  { id: 'vencidos',     label: '+6 meses sin visita', color: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200' },
  { id: 'sin-contacto', label: 'Sin contacto',        color: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200' },
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
  if (days === null) return 'text-muted-foreground';
  if (days <= 60) return 'text-green-700 font-medium';
  if (days <= 180) return 'text-amber-600';
  return 'text-red-600 font-bold';
}

export function VehiclesTable({ vehicles, systemStats, permissions, onAdd, onDelete }: VehiclesTableProps) {
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

  // ── Quick filter ────────────────────────────────────────
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

  // ── Full filtered + sorted list ────────────────────────
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
        }
        return true;
      });
    }

    if (filterMake !== 'all') data = data.filter(v => v.make === filterMake);
    if (filterModel !== 'all') data = data.filter(v => v.model === filterModel);

    if (isSearchActive && searchTerm.trim().length >= MIN_SEARCH) {
      const q = searchTerm.trim().toLowerCase();
      data = data.filter(v => {
          const lowerId = (v.id || '').toLowerCase();
          return [lowerId, v.licensePlate, v.make, v.model, String(v.year), v.ownerName, v.ownerPhone]
            .some(f => (f ?? '').toLowerCase().includes(q))
      });
    }

    return [...data].sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === 'lastServiceDate') {
        const da = a.lastServiceDate ? parseDate(a.lastServiceDate) : null;
        const db = b.lastServiceDate ? parseDate(b.lastServiceDate) : null;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return sortDir === 'asc' ? da.getTime() - db.getTime() : db.getTime() - da.getTime();
      }
      va = (a as any)[sortKey] ?? '';
      vb = (b as any)[sortKey] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' })
        : String(vb).localeCompare(String(va), 'es', { sensitivity: 'base' });
    });
  }, [vehicles, mergedVehicles, isSearchActive, searchTerm, quickFilter, filterMake, filterModel, duplicateIds, sortKey, sortDir]);

  const totalPages = Math.ceil(filteredVehicles.length / PAGE_SIZE);
  const pageData = filteredVehicles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── KPI cards ────────────────────────────────────────
  const kpis = useMemo(() => {
    if (systemStats) {
        return {
            total: systemStats.total || vehicles.length,
            recientes: systemStats.recientes || 0,
            vencidos: systemStats.vencidos || 0,
            sinContacto: systemStats.sinContacto || 0,
            dups: systemStats.dups || 0
        }
    }
    const totales = vehicles.length;
    const recientes = vehicles.filter(v => { const d = daysSinceService(v); return d !== null && d <= 60; }).length;
    const vencidos = vehicles.filter(v => { const d = daysSinceService(v); return d === null || d > 180; }).length;
    const sinContacto = vehicles.filter(v => !v.ownerName || !v.ownerPhone).length;
    const dups = vehicles.filter(v => duplicateIds.has(v.id)).length;
    return { total: totales, recientes, vencidos, sinContacto, dups };
  }, [vehicles, systemStats, duplicateIds]);

  const SortHeader = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={cn("cursor-pointer select-none whitespace-nowrap", className)} onClick={() => handleSort(k)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("h-3 w-3 opacity-40 transition-opacity hover:opacity-100", sortKey === k && "opacity-100 text-primary")} />
        {sortKey === k && <span className="text-[10px] text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
        {[
          { label: 'Coches Totales', value: kpis.total, icon: Car, cls: 'text-slate-800 bg-slate-50 border-slate-200', onClick: () => setQuickFilter('all') },
          { label: 'Servicios 60d', value: kpis.recientes, icon: CheckCircle2, cls: 'text-green-700 bg-green-50 border-green-200', onClick: () => setQuickFilter('recientes') },
          { label: 'Vencidos (+6m)', value: kpis.vencidos, icon: Clock, cls: 'text-red-700 bg-red-50 border-red-200', onClick: () => setQuickFilter('vencidos') },
          { label: 'Sin contacto', value: kpis.sinContacto, icon: Phone, cls: 'text-amber-700 bg-amber-50 border-amber-200', onClick: () => setQuickFilter('sin-contacto') },
        ].map(({ label, value, icon: Icon, cls, onClick }) => (
          <Card
            key={label}
            className={cn("cursor-pointer transition-transform hover:scale-[1.02] shadow-sm", cls)}
            onClick={onClick}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="shrink-0 rounded-full bg-white/50 p-2"><Icon className="h-5 w-5 opacity-80" /></div>
              <div className="min-w-0">
                <p className="text-xl lg:text-2xl font-black leading-none">{value}</p>
                <p className="text-[11px] font-medium opacity-80 uppercase tracking-wider mt-1 leading-none">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {permissions.has('fleet:create') && (
        <div className="flex justify-end pt-2 pb-1">
          <Button onClick={onAdd} className="shadow-md hover:shadow-lg transition-all rounded-full px-6">
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Vehículo
          </Button>
        </div>
      )}

      {/* ── Controls (Search + Filters on one line) ──────────── */}
      <div className="flex flex-col lg:flex-row gap-3 bg-card p-3 rounded-xl border shadow-sm items-stretch lg:items-center">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Buscar por ID, placa, nombre...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="h-10 pl-9 pr-8 bg-muted/30 border-muted-foreground/20 rounded-lg text-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide shrink-0">
          {QUICK_FILTERS.map(({ id, label, color }) => (
            <button
              key={id}
              onClick={() => setQuickFilter(id)}
              className={cn(
                "h-10 px-3 flex items-center justify-center rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap",
                quickFilter === id ? (color || 'bg-primary text-primary-foreground') : "bg-transparent text-muted-foreground hover:bg-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Make/Model */}
        <div className="flex gap-2 shrink-0">
          <Select value={filterMake} onValueChange={v => { setFilterMake(v); setFilterModel('all'); }}>
            <SelectTrigger className="h-10 w-[130px] text-xs bg-muted/30 border-muted-foreground/20 rounded-lg">
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Marcas (Todas)</SelectItem>
              {makes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterModel} onValueChange={setFilterModel} disabled={filterMake === 'all'}>
            <SelectTrigger className="h-10 w-[130px] text-xs bg-muted/30 border-muted-foreground/20 rounded-lg">
              <SelectValue placeholder="Modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Modelos (Todos)</SelectItem>
              {models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      <div className="rounded-xl border shadow-sm bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-900 hover:bg-slate-900 border-none">
                <SortHeader k="id" label="ID Corto" className="pl-4 w-[100px] text-slate-100 [&_*]:text-slate-100" />
                <SortHeader k="licensePlate" label="Placa" className="w-[120px] text-slate-100 [&_*]:text-slate-100" />
                <SortHeader k="make" label="Vehículo (Marca y Modelo)" className="min-w-[200px] text-slate-100 [&_*]:text-slate-100" />
                <SortHeader k="year" label="Año" className="w-[80px] text-slate-100 [&_*]:text-slate-100" />
                <SortHeader k="ownerName" label="Propietario / Contacto" className="w-[220px] text-slate-100 [&_*]:text-slate-100" />
                <SortHeader k="lastServiceDate" label="Último Servicio" className="text-right pr-4 text-slate-100 [&_*]:text-slate-100" />
                <TableHead className="w-[60px] text-center text-slate-100"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length > 0 ? (
                pageData.map(v => {
                  const days = daysSinceService(v);
                  const isDup = duplicateIds.has(v.id);

                  return (
                    <TableRow
                      key={v.id}
                      onClick={() => router.push(`/vehiculos/${v.id}`)}
                      className={cn(
                        "cursor-pointer transition-colors group",
                        isDup ? "bg-purple-50/40 hover:bg-purple-50/70" : "hover:bg-slate-50/80"
                      )}
                    >
                      {/* ID Corto */}
                      <TableCell className="pl-4 font-mono text-[10px] text-muted-foreground uppercase">
                        {v.id.slice(-6)}
                      </TableCell>

                      {/* Placa */}
                      <TableCell>
                        {v.licensePlate ? (
                          <Badge variant="outline" className={cn("font-mono font-bold tracking-widest text-sm bg-white shadow-sm", isDup && "border-purple-300 text-purple-700")}>
                            {v.licensePlate}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sin Placa</span>
                        )}
                      </TableCell>

                      {/* Marca / Modelo */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{v.make || 'Indefinido'}</span>
                          {v.model && <span className="text-xs text-slate-500">{v.model}</span>}
                        </div>
                      </TableCell>

                      {/* Año */}
                      <TableCell>
                        <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">{v.year && !isNaN(Number(v.year)) ? v.year : '—'}</span>
                      </TableCell>

                      {/* Propietario */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                            {v.ownerName || <span className="text-slate-400 italic">Sin nombre registrado</span>}
                          </span>
                          {v.ownerPhone && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                              <Phone className="h-2.5 w-2.5" /> {v.ownerPhone}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Último servicio */}
                      <TableCell className={cn("text-right pr-4", getServiceColor(days))}>
                         <div className="flex flex-col items-end">
                          <span className="text-sm">{getServiceLabel(v)}</span>
                          {days !== null && (
                            <span className="text-[10px] font-medium opacity-80 uppercase tracking-widest">
                              {days === 0 ? 'hoy' : `${days} d`}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                               <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => router.push(`/vehiculos/${v.id}`)}>
                               Abrir Expediente
                             </DropdownMenuItem>
                             {permissions.has('fleet:delete') && (
                               <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => onDelete(v.id)}>
                                 Eliminar permanentemente
                               </DropdownMenuItem>
                             )}
                           </DropdownMenuContent>
                         </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 text-muted-foreground">
                      <div className="bg-slate-100 p-4 rounded-full">
                         <Car className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="font-medium text-slate-600">No se encontraron vehículos.</p>
                      {isSearchActive && <p className="text-xs">Intenta con otra búsqueda o limpia los filtros.</p>}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {filteredVehicles.length > 0 && (
          <div className="flex items-center justify-between border-t bg-slate-50 px-4 py-2">
             <p className="text-xs text-muted-foreground">
               Mostrando {pageData.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0} a {Math.min(page * PAGE_SIZE, filteredVehicles.length)} de {filteredVehicles.length}
             </p>
             <div className="flex items-center gap-1">
               <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                 <ChevronLeft className="h-3 w-3 mr-1" /> Ant
               </Button>
               <span className="text-xs font-medium px-2 text-muted-foreground">Pág. {page} / {Math.max(1, totalPages)}</span>
               <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                 Sig <ChevronRight className="h-3 w-3 ml-1" />
               </Button>
             </div>
          </div>
        )}
      </div>

    </div>
  );
}
