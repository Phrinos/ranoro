// src/app/(app)/usuarios/components/users-list-tab.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, PlusCircle, Shield, ArrowRight, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { User as AppUser } from "@/types";

interface Props {
  users: AppUser[];
}

const ROLE_COLORS: Record<string, string> = {
  Superadministrador: "bg-purple-100 text-purple-800 border-purple-300",
  Administrador: "bg-blue-100 text-blue-800 border-blue-300",
  Asesor: "bg-emerald-100 text-emerald-800 border-emerald-300",
  Técnico: "bg-amber-100 text-amber-800 border-amber-300",
  Recepcionista: "bg-pink-100 text-pink-800 border-pink-300",
};

export function UsersListTab({ users }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users.filter((u) => (showArchived ? u.isArchived : !u.isArchived));
    if (!q) return list;
    return list.filter((u) => `${u.name} ${u.role} ${u.email ?? ""}`.toLowerCase().includes(q));
  }, [users, search, showArchived]);

  const active = users.filter((u) => !u.isArchived);
  const archived = users.filter((u) => u.isArchived);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, rol, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => setShowArchived(!showArchived)}
            className={cn("flex-1 sm:flex-none", showArchived && "border-amber-400 text-amber-700")}
          >
            <Archive className="mr-2 h-4 w-4" />
            {showArchived ? `Activos (${active.length})` : `Archivados (${archived.length})`}
          </Button>
          <Button onClick={() => router.push("/usuarios/nuevo")} className="flex-1 sm:flex-none">
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Usuario
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} {showArchived ? "archivados" : "activos"}</p>

      {/* Table — desktop */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol del Sistema</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((user) => (
                  <TableRow
                    key={user.id}
                    className="hover:bg-muted/40 cursor-pointer"
                    onClick={() => router.push(`/usuarios/${user.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="bg-foreground/10 p-2 rounded-full">
                          <Shield className="h-4 w-4 text-foreground/60" />
                        </div>
                        <p className="font-semibold text-sm">{user.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[11px]", ROLE_COLORS[user.role] ?? "")}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={user.isArchived ? "text-muted-foreground" : "border-emerald-400 text-emerald-700"}>
                        {user.isArchived ? "Archivado" : "Activo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No se encontraron usuarios.
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
        {filtered.map((user) => (
          <Card key={user.id} className="cursor-pointer hover:shadow-md" onClick={() => router.push(`/usuarios/${user.id}`)}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-foreground/10 p-2 rounded-full shrink-0">
                  <Shield className="h-5 w-5 text-foreground/60" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{user.name}</p>
                  <Badge variant="outline" className={cn("text-[10px] mt-0.5", ROLE_COLORS[user.role] ?? "")}>
                    {user.role}
                  </Badge>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-muted-foreground">{user.email || "Sin email"}</p>
                <Badge variant="outline" className={cn("text-[10px] mt-0.5", user.isArchived ? "" : "border-emerald-400 text-emerald-700")}>
                  {user.isArchived ? "Archivado" : "Activo"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <div className="text-center text-muted-foreground py-12">No se encontraron usuarios.</div>}
      </div>
    </div>
  );
}
