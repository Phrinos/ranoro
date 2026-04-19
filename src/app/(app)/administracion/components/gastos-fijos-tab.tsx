// src/app/(app)/administracion/components/gastos-fijos-tab.tsx
"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { db } from "@/lib/firebaseClient";
import { addDoc, updateDoc, deleteDoc, doc, collection } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { FixedExpense } from "../hooks/use-admin-data";

const schema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  amount: z.coerce.number().min(0, "Monto requerido"),
  category: z.string().min(1, "Categoría requerida"),
  frequency: z.enum(["mensual", "quincenal", "semanal"]),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

const CATEGORIES = ["Servicios Básicos", "Renta", "Nómina", "Seguros", "Mantenimiento", "Marketing", "Impuestos", "Otro"];
const FREQ_LABELS: Record<string, string> = { mensual: "Mensual", quincenal: "Quincenal", semanal: "Semanal" };

function ExpenseDialog({
  open, onOpenChange, expense, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expense: FixedExpense | null;
  onSave: (v: FormValues, id?: string) => Promise<void>;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { name: "", amount: 0, category: "", frequency: "mensual", isActive: true },
  });

  React.useEffect(() => {
    if (open) form.reset({
      name: expense?.name ?? "",
      amount: expense?.amount ?? 0,
      category: expense?.category ?? "",
      frequency: expense?.frequency ?? "mensual",
      isActive: expense?.isActive ?? true,
    });
  }, [open, expense, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{expense ? "Editar" : "Nuevo"} Gasto Fijo</DialogTitle>
          <DialogDescription>Gastos recurrentes del taller.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => onSave(v, expense?.id).then(() => onOpenChange(false)))} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Nombre *</FormLabel>
                <FormControl><Input placeholder="Ej: Renta local, Internet…" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Monto *</FormLabel>
                  <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                  <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="frequency" render={({ field }) => (
                <FormItem><FormLabel>Frecuencia</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(FREQ_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel>Categoría *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger></FormControl>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="isActive" render={({ field }) => (
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                <Label>Activo</Label>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </div>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Guardando…" : expense ? "Actualizar" : "Crear"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface Props { fixedExpenses: FixedExpense[] }

export function GastosFijosTab({ fixedExpenses }: Props) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<FixedExpense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FixedExpense | null>(null);

  const totalMensual = fixedExpenses
    .filter((e) => e.isActive)
    .reduce((s, e) => {
      const m = e.frequency === "quincenal" ? 2 : e.frequency === "semanal" ? 4.33 : 1;
      return s + e.amount * m;
    }, 0);

  const handleSave = useCallback(async (values: FormValues, id?: string) => {
    try {
      if (id) { await updateDoc(doc(db, "fixedExpenses", id), values); toast({ title: "Gasto actualizado" }); }
      else { await addDoc(collection(db, "fixedExpenses"), values); toast({ title: "Gasto creado" }); }
    } catch { toast({ title: "Error al guardar", variant: "destructive" }); }
  }, [toast]);

  const handleDelete = useCallback(async (e: FixedExpense) => {
    try { await deleteDoc(doc(db, "fixedExpenses", e.id)); toast({ title: "Eliminado" }); setDeleteTarget(null); }
    catch { toast({ title: "Error al eliminar", variant: "destructive" }); }
  }, [toast]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Gastos Fijos</h3>
            <p className="text-sm text-muted-foreground">Total mensual estimado: <span className="font-bold text-foreground">{formatCurrency(totalMensual)}</span></p>
          </div>
          <Button onClick={() => { setEditExpense(null); setDialogOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Gasto
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fixedExpenses.length > 0 ? fixedExpenses.map((e) => (
            <Card key={e.id} className={!e.isActive ? "opacity-50" : ""}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{e.name}</p>
                  <p className="text-[11px] text-muted-foreground">{e.category} · {FREQ_LABELS[e.frequency]}</p>
                  <Badge variant={e.isActive ? "default" : "secondary"} className="text-[10px] mt-1">{e.isActive ? "Activo" : "Inactivo"}</Badge>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-base">{formatCurrency(e.amount)}</p>
                  <div className="flex gap-1 mt-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditExpense(e); setDialogOpen(true); }}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(e)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )) : (
            <div className="col-span-2 text-center text-muted-foreground py-12 border-2 border-dashed rounded-xl">
              Sin gastos fijos registrados.
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Gasto Fijo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar &quot;{deleteTarget?.name}&quot;? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
