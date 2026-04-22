// src/app/(app)/punto-de-venta/components/suppliers-tab.tsx
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, PlusCircle, Phone, Mail, Truck, Edit } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { db } from "@/lib/firebaseClient";
import { addDoc, updateDoc, doc, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { SupplierDialog, type SupplierFormValues } from "./dialogs/supplier-dialog";
import type { Supplier } from "@/types";
import type { PosPurchase } from "../hooks/use-pos-data";
import { useRouter } from "next/navigation";

interface Props {
  suppliers: Supplier[];
  purchases: PosPurchase[];
}

export function SuppliersTab({ suppliers, purchases }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

  const enriched = useMemo(() => {
    return suppliers.map((s) => {
      const supplierPurchases = purchases.filter((p) => p.supplierId === s.id);
      const totalSpent = supplierPurchases.reduce((acc, p) => acc + (p.invoiceTotal || 0), 0);
      return { ...s, purchaseCount: supplierPurchases.length, totalSpent };
    });
  }, [suppliers, purchases]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((s) =>
      `${s.name} ${s.contactPerson ?? ""} ${s.phone ?? ""}`.toLowerCase().includes(q)
    );
  }, [enriched, search]);

  const handleSave = useCallback(async (values: SupplierFormValues, id?: string) => {
    try {
      if (id) {
        await updateDoc(doc(db, "suppliers", id), values as any);
        toast({ title: "Proveedor actualizado" });
      } else {
        await addDoc(collection(db, "suppliers"), values);
        toast({ title: "Proveedor creado" });
      }
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  }, [toast]);

  const openEdit = (s: Supplier) => { setEditSupplier(s); setDialogOpen(true); };
  const openNew = () => { setEditSupplier(null); setDialogOpen(true); };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar nombre, contacto…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
          <Button onClick={openNew} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Proveedor
          </Button>
        </div>

        {/* Table — desktop */}
        <div className="hidden md:block">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-center">Compras</TableHead>
                    <TableHead className="text-right">Total comprado</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length > 0 ? filtered.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => router.push(`/punto-de-venta/proveedores/${s.id}`)}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="bg-foreground/10 p-2 rounded-xl">
                            <Truck className="h-4 w-4 text-foreground/60" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{s.name}</p>
                            {s.rfc && <p className="text-[11px] text-muted-foreground font-mono">{s.rfc}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{s.contactPerson || "—"}</p>
                        {s.phone && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {s.phone}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{(s as any).purchaseCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency((s as any).totalSpent)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(s); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        No se encontraron proveedores.
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
          {filtered.map((s) => (
            <Card key={s.id} className="cursor-pointer hover:shadow-md" onClick={() => router.push(`/punto-de-venta/proveedores/${s.id}`)}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="bg-foreground/10 p-2 rounded-xl shrink-0">
                    <Truck className="h-4 w-4 text-foreground/60" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{s.name}</p>
                    {s.contactPerson && <p className="text-xs text-muted-foreground">{s.contactPerson}</p>}
                    {s.phone && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-sm">{formatCurrency((s as any).totalSpent)}</p>
                  <p className="text-[11px] text-muted-foreground">{(s as any).purchaseCount} compras</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <SupplierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={editSupplier}
        onSave={handleSave}
      />
    </>
  );
}
