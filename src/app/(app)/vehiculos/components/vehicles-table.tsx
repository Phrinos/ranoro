
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
  Car, Phone, Clock, ArrowUpDown, CheckCircle2, CopyX,
} from 'lucide-react';
import { format, isValid, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDate } from '@/lib/forms';
import { useRouter } from 'next/navigation';
import { inventoryService } from '@/lib/services';
import { cn } from '@/lib/utils';

interface VehiclesTableProps {
  vehicles: Vehicle[];
  onSave: (data: any, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAdd: () => void;
}

const MIN_SEARCH = 6;
const PAGE_SIZE = 25;

type QuickFilter = 'all' | 'recientes' | 'vencidos' | 'sin-contacto' | 'duplicados';
type SortKey = 'licensePlate' | 'make' | 'model' | 'year' | 'ownerName' | 'lastServiceDate';
type SortDir = 'asc' | 'desc';

const QUICK_FILTERS: { id: QuickFilter; label: string; color: string }[] = [
  { id: 'all',          label: 'Todos',              color: '' },
  { id: 'recientes',    label: '← 60 días',           color: 'text-green-700 border-green-300 data-[active=true]:bg-green-600 data-[active=true]:text-white data-[active=true]:border-green-600' },
  { id: 'vencidos',     label: '+6 meses sin visita', color: 'text-red-700 border-red-300 data-[active=true]:bg-red-600 data-[active=true]:text-white data-[active=true]:border-red-600' },
  { id: 'sin-contacto', label: 'Sin datos de contacto', color: 'text-amber-700 border-amber-300 data-[active=true]:bg-amber-500 data-[active=true]:text-white data-[active=true]:border-amber-500' },
  { id: 'duplicados',   label: '🔍 Posibles duplicados', color: 'text-purple-700 border-purple-300 data-[active=true]:bg-purple-600 data-[active=true]:text-white data-[active=true]:border-purple-600' },
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

export function VehiclesTable({ vehicles, onAdd }: VehiclesTableProps) {
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

  // ── Make / Model filter ─────────────────────────────────
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

    // Quick filter
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

    // Make filter
    if (filterMake !== 'all') data = data.filter(v => v.make === filterMake);
    // Model filter
    if (filterModel !== 'all') data = data.filter(v => v.model === filterModel);

    // Local search (if isSearchActive, filter already merged, just apply text)
    if (isSearchActive && searchTerm.trim().length >= MIN_SEARCH) {
      const q = searchTerm.trim().toLowerCase();
      data = data.filter(v =>
        [v.licensePlate, v.make, v.model, String(v.year), v.ownerName, v.ownerPhone]
          .some(f => (f ?? '').toLowerCase().includes(q))
      );
    }

    // Sort
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

  // ── KPI cards (based on ALL vehicles, not filtered) ──────
  const kpis = useMemo(() => {
    const total = filteredVehicles.length;
    const recientes = filteredVehicles.filter(v => { const d = daysSinceService(v); return d !== null && d <= 60; }).length;
    const vencidos = filteredVehicles.filter(v => { const d = daysSinceService(v); return d === null || d > 180; }).length;
    const sinContacto = filteredVehicles.filter(v => !v.ownerName || !v.ownerPhone).length;
    const dups = filteredVehicles.filter(v => duplicateIds.has(v.id)).length;
    return { total, recientes, vencidos, sinContacto, dups };
  }, [filteredVehicles, duplicateIds]);

  const SortHeader = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={cn("cursor-pointer select-none whitespace-nowrap", className)} onClick={() => handleSort(k)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("h-3.5 w-3.5 opacity-40", sortKey === k && "opacity-100 text-primary")} />
        {sortKey === k && <span className="text-[10px] text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>}
      </div>
    </TableHead>
  );

  const issueFlags = (v: Vehicle) => {
    const flags: string[] = [];
    if (!v.ownerName) flags.push('Sin nombre');
    if (!v.ownerPhone) flags.push('Sin teléfono');
    if (duplicateIds.has(v.id)) flags.push('Placa duplicada');
    return flags;
  };

  return (
    <div className="space-y-5">

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total en vista', value: kpis.total, icon: Car, cls: 'text-foreground', onClick: () => setQuickFilter('all') },
          { label: 'Servicios recientes', value: kpis.recientes, icon: CheckCircle2, cls: 'text-green-600', onClick: () => setQuickFilter('recientes') },
          { label: 'Sin visita +6 meses', value: kpis.vencidos, icon: Clock, cls: 'text-red-600', onClick: () => setQuickFilter('vencidos') },
          { label: 'Sin contacto', value: kpis.sinContacto, icon: Phone, cls: 'text-amber-600', onClick: () => setQuickFilter('sin-contacto') },
          { label: 'Posibles duplicados', value: kpis.dups, icon: CopyX, cls: 'text-purple-600', onClick: () => setQuickFilter('duplicados') },
        ].map(({ label, value, icon: Icon, cls, onClick }) => (
          <Card
            key={label}
            className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200"
            onClick={onClick}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("shrink-0", cls)}><Icon className="h-6 w-6" /></div>
              <div className="min-w-0">
                <p className={cn("text-2xl font-extrabold leading-tight", cls)}>{value}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Search + Filters ───────────────────────────────── */}
      <div className="space-y-3">
        {/* Row 1: Search */}
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={`Buscar placa, nombre, marca… (mín. ${MIN_SEARCH} chars)`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-10 pl-9 pr-8 bg-white"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {isSearching && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Buscando…</span>}
          {!isSearchActive && searchTerm.length > 0 && !isSearching && (
            <p className="text-xs text-amber-600 font-medium">Escribe al menos {MIN_SEARCH} caracteres</p>
          )}

          {/* Make + Model selects */}
          <div className="flex gap-2 ml-auto">
            <Select value={filterMake} onValueChange={v => { setFilterMake(v); setFilterModel('all'); }}>
              <SelectTrigger className="h-10 w-[140px] bg-white text-sm">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las marcas</SelectItem>
                {makes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterModel} onValueChange={setFilterModel} disabled={filterMake === 'all'}>
              <SelectTrigger className="h-10 w-[140px] bg-white text-sm">
                <SelectValue placeholder="Modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los modelos</SelectItem>
                {models.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 2: Quick filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">Vista rápida:</span>
          {QUICK_FILTERS.map(({ id, label, color }) => (
            <button
              key={id}
              data-active={quickFilter === id}
              onClick={() => setQuickFilter(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all bg-card hover:bg-muted",
                quickFilter === id ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-border",
                id !== 'all' && color
              )}
            >
              {label}
            </button>
          ))}
          {(quickFilter !== 'all' || filterMake !== 'all' || filterModel !== 'all') && (
            <button
              onClick={() => { setQuickFilter('all'); setFilterMake('all'); setFilterModel('all'); }}
              className="text-xs text-primary underline hover:no-underline ml-1"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Pagination summary ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          Mostrando {pageData.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filteredVehicles.length)} de {filteredVehicles.length} vehículos
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="outline" className="bg-card">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <span className="text-xs text-muted-foreground">{page}/{Math.max(1, totalPages)}</span>
          <Button size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} variant="outline" className="bg-card">
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-black hover:bg-black">
                <SortHeader k="licensePlate" label="Placa" className="pl-4 w-[110px] text-white [&_*]:text-white [&_svg]:text-white/70" />
                <SortHeader k="make" label="Marca / Modelo" className="w-[180px] text-white [&_*]:text-white [&_svg]:text-white/70" />
                <SortHeader k="year" label="Año" className="w-[70px] text-white [&_*]:text-white [&_svg]:text-white/70" />
                <SortHeader k="ownerName" label="Propietario" className="text-white [&_*]:text-white [&_svg]:text-white/70" />
                <TableHead className="text-white">Teléfono</TableHead>
                <SortHeader k="lastServiceDate" label="Último servicio" className="text-right text-white [&_*]:text-white [&_svg]:text-white/70" />
                <TableHead className="text-center w-[90px] text-white">Alertas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length > 0 ? (
                pageData.map(v => {
                  const days = daysSinceService(v);
                  const issues = issueFlags(v);
                  const yearVal = v.year && !isNaN(Number(v.year)) ? String(v.year) : '—';

                  return (
                    <TableRow
                      key={v.id}
                      onClick={() => router.push(`/vehiculos/${v.id}`)}
                      className={cn(
                        "cursor-pointer hover:bg-muted/40 transition-colors",
                        duplicateIds.has(v.id) && "bg-purple-50/60 dark:bg-purple-950/20"
                      )}
                    >
                      {/* Placa */}
                      <TableCell className="pl-4 font-mono font-extrabold text-base tracking-widest text-foreground">
                        {v.licensePlate || <span className="text-muted-foreground font-normal italic text-sm">Sin placa</span>}
                      </TableCell>

                      {/* Marca / Modelo */}
                      <TableCell>
                        <span className="font-semibold text-foreground">{v.make || '—'}</span>
                        {v.model && <span className="text-muted-foreground ml-1 text-sm">{v.model}</span>}
                      </TableCell>

                      {/* Año */}
                      <TableCell>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-md font-medium">{yearVal}</span>
                      </TableCell>

                      {/* Propietario */}
                      <TableCell>
                        {v.ownerName
                          ? <span>{v.ownerName}</span>
                          : <span className="text-muted-foreground/60 italic text-xs">Sin nombre</span>}
                      </TableCell>

                      {/* Teléfono */}
                      <TableCell>
                        {v.ownerPhone
                          ? <span className="text-sm flex items-center gap-1"><Phone className="h-3 w-3 text-muted-foreground" />{v.ownerPhone}</span>
                          : <span className="text-muted-foreground/60 italic text-xs">Sin teléfono</span>}
                      </TableCell>

                      {/* Último servicio */}
                      <TableCell className={cn("text-right text-sm", getServiceColor(days))}>
                        <div className="flex flex-col items-end gap-0.5">
                          <span>{getServiceLabel(v)}</span>
                          {days !== null && (
                            <span className="text-[10px] font-normal text-muted-foreground">
                              {days === 0 ? 'hoy' : `hace ${days}d`}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Alertas */}
                      <TableCell className="text-center">
                        {issues.length > 0 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            {issues.map((issue, i) => (
                              <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 bg-red-50 text-red-700 border-red-200 leading-tight">
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto opacity-60" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 opacity-30" />
                      <p className="font-medium text-sm">
                        {isSearchActive || quickFilter !== 'all' || filterMake !== 'all'
                          ? 'No hay vehículos con los filtros aplicados'
                          : 'No hay vehículos registrados'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
