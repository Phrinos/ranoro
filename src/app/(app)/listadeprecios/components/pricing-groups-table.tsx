// src/app/(app)/listadeprecios/components/pricing-groups-table.tsx
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
import { Search, MoreHorizontal, Pencil, Trash2, Car, Wrench, DollarSign, Package, Plus } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { PricingGroup } from "@/types";
import { calcAllServices } from "../lib/pricing-calc";

interface Props {
  groups: PricingGroup[];
  onEdit: (group: PricingGroup) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

export function PricingGroupsTable({ groups, onEdit, onDelete, onNew }: Props) {
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PricingGroup | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter(g => {
      const vehicleStr = g.vehicles?.map(v => `${v.make} ${v.model} ${v.yearFrom} ${v.yearTo}`).join(" ").toLowerCase() ?? "";
      return g.name?.toLowerCase().includes(q) || vehicleStr.includes(q);
    });
  }, [groups, search]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
          <Car className="h-8 w-8 text-zinc-400" />
        </div>
        <div>
          <p className="font-bold text-lg">Sin grupos de precios</p>
          <p className="text-muted-foreground text-sm mt-1">Crea el primer grupo para que la IA pueda responder cotizaciones.</p>
        </div>
        <Button onClick={onNew} className="bg-black text-white hover:bg-zinc-800 gap-2 mt-2">
          <Plus className="h-4 w-4" /> Crear Primer Grupo
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por marca, modelo, año…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-white"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-900 hover:bg-zinc-900">
                  <TableHead className="text-white font-bold rounded-tl-lg">Vehículos</TableHead>
                  <TableHead className="text-white font-bold text-center">Capacidad</TableHead>
                  <TableHead className="text-white font-bold text-center">Refacciones</TableHead>
                  <TableHead className="text-white font-bold text-center">Servicios</TableHead>
                  <TableHead className="text-white font-bold">Rango de Precios</TableHead>
                  <TableHead className="text-white rounded-tr-lg" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(group => {
                  const services = calcAllServicesQuick(group);
                  const minPrice = services.length ? Math.min(...services.map(s => s.totalPrice)) : null;
                  const maxPrice = services.length ? Math.max(...services.map(s => s.totalPrice)) : null;

                  return (
                    <TableRow
                      key={group.id}
                      className="cursor-pointer hover:bg-zinc-50/80"
                      onClick={() => onEdit(group)}
                    >
                      <TableCell className="py-3">
                        <div>
                          <p className="font-bold text-sm leading-tight">{group.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {group.vehicles?.slice(0, 3).map((v, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                                {v.make} {v.model} {v.yearFrom}–{v.yearTo}
                                {v.engine && ` · ${v.engine}`}
                              </Badge>
                            ))}
                            {(group.vehicles?.length ?? 0) > 3 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                +{group.vehicles.length - 3} más
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-semibold">{group.oilCapacityLiters ?? "—"}L</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-bold">{group.partCategories?.reduce((s, c) => s + c.variants.length, 0) ?? 0}</span>
                          <span className="text-[10px] text-muted-foreground">{group.partCategories?.length ?? 0} cat.</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-bold">{group.services?.length ?? 0}</span>
                      </TableCell>
                      <TableCell>
                        {minPrice !== null && maxPrice !== null ? (
                          <div>
                            <p className="text-sm font-bold text-emerald-700">
                              {minPrice === maxPrice ? formatCurrency(minPrice) : `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`}
                            </p>
                            <p className="text-[10px] text-muted-foreground">por servicio (defaults)</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin servicios</span>
                        )}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()} className="pr-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => onEdit(group)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(group)}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
        {filtered.map(group => (
          <Card key={group.id} className="cursor-pointer hover:shadow-md" onClick={() => onEdit(group)}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-sm">{group.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{group.oilCapacityLiters ?? "—"}L · {(group.partCategories?.length ?? 0)} categorías · {(group.services?.length ?? 0)} servicios</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={e => { e.stopPropagation(); setDeleteTarget(group); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {group.vehicles?.map((v, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">{v.make} {v.model} {v.yearFrom}–{v.yearTo}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se perderán todos los vehículos, refacciones y servicios de este grupo. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) { onDelete(deleteTarget.id); setDeleteTarget(null); } }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Safe price calculation — returns empty array on error */
function calcAllServicesQuick(group: PricingGroup) {
  try {
    if (!group.partCategories?.length || !group.services?.length) return [];
    return calcAllServices(group);
  } catch {
    return [];
  }
}
