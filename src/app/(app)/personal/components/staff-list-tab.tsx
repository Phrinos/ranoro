// src/app/(app)/personal/components/staff-list-tab.tsx
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, PlusCircle, User, ChevronDown, ChevronUp, Archive, ArrowRight } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { personnelService } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { User as UserType } from "@/types";

interface Props {
  staff: UserType[];
  archivedStaff: UserType[];
}

const ROLE_COLORS: Record<string, string> = {
  Superadministrador: "bg-purple-100 text-purple-800 border-purple-300",
  Administrador: "bg-blue-100 text-blue-800 border-blue-300",
  Asesor: "bg-emerald-100 text-emerald-800 border-emerald-300",
  Técnico: "bg-amber-100 text-amber-800 border-amber-300",
  Recepcionista: "bg-pink-100 text-pink-800 border-pink-300",
};

export function StaffListTab({ staff, archivedStaff }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = showArchived ? archivedStaff : staff;
    if (!q) return list;
    return list.filter((s) =>
      `${s.name} ${s.role} ${s.email ?? ""}`.toLowerCase().includes(q)
    );
  }, [staff, archivedStaff, search, showArchived]);

  const handleArchive = useCallback(async (member: UserType) => {
    try {
      await personnelService.archivePersonnel(member.id, !member.isArchived);
      toast({ title: member.isArchived ? "Reactivado" : "Archivado" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }, [toast]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, rol…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
            className={cn("flex-1 sm:flex-none", showArchived && "border-amber-400 text-amber-700")}
          >
            <Archive className="mr-2 h-4 w-4" />
            {showArchived ? `Activos (${staff.length})` : `Archivados (${archivedStaff.length})`}
          </Button>
          <Button onClick={() => router.push("/personal/nuevo")} className="flex-1 sm:flex-none">
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo
          </Button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} {showArchived ? "archivados" : "activos"}
      </p>

      {/* Table — desktop */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead className="text-right">Salario</TableHead>
                  <TableHead className="text-right">Comisión</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((member) => (
                  <TableRow
                    key={member.id}
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => router.push(`/personal/${member.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="bg-foreground/10 p-2 rounded-full">
                          <User className="h-4 w-4 text-foreground/60" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{member.name}</p>
                          {member.email && <p className="text-[11px] text-muted-foreground">{member.email}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[11px]", ROLE_COLORS[member.role] ?? "")}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {member.monthlySalary ? formatCurrency(member.monthlySalary) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {member.commissionRate != null ? `${member.commissionRate}%` : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); router.push(`/personal/${member.id}`); }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No se encontraron miembros del equipo.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Cards — mobile */}
      <div className="grid gap-3 md:hidden">
        {filtered.map((member) => (
          <Card key={member.id} className="cursor-pointer hover:shadow-md" onClick={() => router.push(`/personal/${member.id}`)}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-foreground/10 p-2 rounded-full shrink-0">
                  <User className="h-5 w-5 text-foreground/60" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{member.name}</p>
                  <Badge variant="outline" className={cn("text-[10px] mt-0.5", ROLE_COLORS[member.role] ?? "")}>
                    {member.role}
                  </Badge>
                </div>
              </div>
              <div className="text-right shrink-0">
                {member.monthlySalary ? (
                  <p className="font-bold text-sm">{formatCurrency(member.monthlySalary)}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Sin sueldo</p>
                )}
                {member.commissionRate != null && (
                  <p className="text-xs text-muted-foreground">{member.commissionRate}% comisión</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-12">No se encontraron miembros del equipo.</div>
        )}
      </div>
    </div>
  );
}
