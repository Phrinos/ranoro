// src/app/(app)/listadeprecios/components/vehicles-list-tab.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, MoreHorizontal, Pencil, Trash2, Car, PlusCircle, ChevronRight, Fuel } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PricingGroup, OilType } from "@/types";
import { calcServicePrice, generateGroupName } from "../lib/pricing-calc";

const CURRENT_YEAR = new Date().getFullYear();

interface Props {
  groups: PricingGroup[];
  oils: OilType[];
  onOpen: (group: PricingGroup) => void;
  onCreate: (name: string, vehicles: PricingGroup["vehicles"], oilCapacity: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function VehiclesListTab({ groups, oils, onOpen, onCreate, onDelete }: Props) {
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PricingGroup | null>(null);
  const [newGroupOpen, setNewGroupOpen] = useState(false);

  // New group wizard state
  const [nMake, setNMake] = useState("");
  const [nModel, setNModel] = useState("");
  const [nYearFrom, setNYearFrom] = useState(2015);
  const [nYearTo, setNYearTo] = useState(CURRENT_YEAR);
  const [nEngine, setNEngine] = useState("");
  const [nOilCap, setNOilCap] = useState(4);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(g => {
      const vstr = (g.vehicles ?? []).map(v => `${v.make} ${v.model} ${v.yearFrom} ${v.yearTo}`).join(" ").toLowerCase();
      return (g.name?.toLowerCase() || "").includes(q) || vstr.includes(q);
    });
  }, [groups, search]);

  const handleCreate = async () => {
    if (!nMake.trim() || !nModel.trim()) return;
    setCreating(true);
    const vehicles: PricingGroup["vehicles"] = [{
      make: nMake.toUpperCase(), model: nModel.toUpperCase(),
      yearFrom: nYearFrom, yearTo: nYearTo,
      engine: nEngine.trim() || undefined,
    }];
    const name = generateGroupName(vehicles);
    try {
      await onCreate(name, vehicles, nOilCap);
      setNewGroupOpen(false);
      setNMake(""); setNModel(""); setNYearFrom(2015); setNYearTo(CURRENT_YEAR); setNEngine(""); setNOilCap(4);
    } finally { setCreating(false); }
  };

  const getMinMaxPrice = (g: PricingGroup): [number, number] | null => {
    if (!g.services?.length) return null;
    const prices: number[] = [];
    for (const svc of g.services) {
      try { prices.push(calcServicePrice(g, svc, oils).totalPrice); } catch {}
    }
    if (!prices.length) return null;
    return [Math.min(...prices), Math.max(...prices)];
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por marca, modelo…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white" />
          </div>
          <Button className="bg-black text-white hover:bg-zinc-800 gap-2" onClick={() => setNewGroupOpen(true)}>
            <PlusCircle className="h-4 w-4" /> Nuevo Grupo
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-14 w-14 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <Car className="h-7 w-7 text-zinc-400" />
            </div>
            <div>
              <p className="font-bold">Sin grupos de vehículos</p>
              <p className="text-muted-foreground text-sm">Crea el primero para empezar a registrar precios.</p>
            </div>
            <Button className="bg-black text-white hover:bg-zinc-800 gap-2" onClick={() => setNewGroupOpen(true)}>
              <PlusCircle className="h-4 w-4" /> Crear Primer Grupo
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-900 hover:bg-zinc-900">
                        <TableHead className="text-white font-bold rounded-tl-lg">Vehículos</TableHead>
                        <TableHead className="text-white font-bold text-center">Aceite</TableHead>
                        <TableHead className="text-white font-bold text-center">Insumos</TableHead>
                        <TableHead className="text-white font-bold text-center">Trabajos</TableHead>
                        <TableHead className="text-white font-bold">Rango de precios</TableHead>
                        <TableHead className="text-white rounded-tr-lg" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(g => {
                        const priceRange = getMinMaxPrice(g);
                        return (
                          <TableRow
                            key={g.id}
                            className="cursor-pointer hover:bg-zinc-50/80"
                            onClick={() => onOpen(g)}
                          >
                            <TableCell className="py-3">
                              <p className="font-bold text-sm">{g.name}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(g.vehicles ?? []).slice(0, 3).map((v, i) => (
                                  <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                                    {v.make} {v.model} {v.yearFrom}–{v.yearTo}{v.engine ? ` · ${v.engine}` : ""}
                                  </Badge>
                                ))}
                                {(g.vehicles?.length ?? 0) > 3 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">+{g.vehicles.length - 3}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Fuel className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-sm font-semibold">{g.oilCapacityLiters ?? "—"}L</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-bold">{g.parts?.length ?? 0}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-bold">{g.services?.length ?? 0}</span>
                            </TableCell>
                            <TableCell>
                              {priceRange
                                ? <p className="text-sm font-bold text-emerald-700">{priceRange[0] === priceRange[1] ? formatCurrency(priceRange[0]) : `${formatCurrency(priceRange[0])} – ${formatCurrency(priceRange[1])}`}</p>
                                : <span className="text-xs text-muted-foreground">Sin trabajos</span>}
                            </TableCell>
                            <TableCell onClick={e => e.stopPropagation()} className="pr-2">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpen(g)}>
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-36">
                                    <DropdownMenuItem onClick={() => onOpen(g)}><Pencil className="h-3.5 w-3.5 mr-2" /> Editar</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(g)}>
                                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {filtered.map(g => (
                <Card key={g.id} className="cursor-pointer hover:shadow-md" onClick={() => onOpen(g)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-sm">{g.name}</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={e => { e.stopPropagation(); setDeleteTarget(g); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{g.oilCapacityLiters}L · {g.parts?.length ?? 0} insumos · {g.services?.length ?? 0} trabajos</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* New group dialog */}
      <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
        <DialogContent className="p-0 overflow-hidden">
          <DialogHeader className="bg-zinc-900 text-white px-6 py-5">
            <DialogTitle className="text-white font-black">Nuevo Grupo de Vehículos</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <p className="text-xs text-muted-foreground">Ingresa el primer vehículo del grupo. Podrás agregar más después.</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Marca *</Label>
                <Input value={nMake} onChange={e => setNMake(e.target.value.toUpperCase())} className="bg-white uppercase" placeholder="NISSAN" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Modelo *</Label>
                <Input value={nModel} onChange={e => setNModel(e.target.value.toUpperCase())} className="bg-white uppercase" placeholder="VERSA" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Año desde</Label>
                <Input type="number" value={nYearFrom} onChange={e => setNYearFrom(parseInt(e.target.value) || 2015)} className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Año hasta</Label>
                <Input type="number" value={nYearTo} onChange={e => setNYearTo(parseInt(e.target.value) || CURRENT_YEAR)} className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Motor <span className="text-muted-foreground">(opcional)</span></Label>
                <Input value={nEngine} onChange={e => setNEngine(e.target.value)} className="bg-white" placeholder="1.6L" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Fuel className="h-3.5 w-3.5 text-amber-500" /> Litros de aceite</Label>
                <Input type="number" step="0.5" min="0" value={nOilCap} onChange={e => setNOilCap(parseFloat(e.target.value) || 0)} className="bg-white" />
              </div>
            </div>
          </div>
          <DialogFooter className="px-6 pb-5 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setNewGroupOpen(false)}>Cancelar</Button>
            <Button className="bg-black text-white hover:bg-zinc-800" onClick={handleCreate} disabled={creating || !nMake.trim() || !nModel.trim()}>
              {creating ? "Creando…" : "Crear Grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>Se perderán todos los insumos y trabajos de este grupo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={async () => { if (deleteTarget) { await onDelete(deleteTarget.id); setDeleteTarget(null); } }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
