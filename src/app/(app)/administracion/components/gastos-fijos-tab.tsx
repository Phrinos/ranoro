// src/app/(app)/administracion/components/gastos-fijos-tab.tsx
"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
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
import { Textarea } from "@/components/ui/textarea";
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
  notes: z.string().optional(),
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
    defaultValues: { name: "", amount: 0, category: "", frequency: "mensual", isActive: true, notes: "" },
  });

  React.useEffect(() => {
    if (open) form.reset({
      name: expense?.name ?? "",
      amount: expense?.amount ?? 0,
      category: expense?.category ?? "",
      frequency: expense?.frequency ?? "mensual",
      isActive: expense?.isActive ?? true,
      notes: expense?.notes ?? (expense as any)?.notas ?? "",
    });
  }, [open, expense, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <div className="bg-red-700 text-white px-6 py-4">
          <DialogTitle className="text-base font-bold text-white">{expense ? "Editar" : "Nuevo"} Gasto Fijo</DialogTitle>
          <DialogDescription className="text-red-200 text-xs mt-0.5">Gastos recurrentes del taller.</DialogDescription>
        </div>
        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => onSave(v, expense?.id).then(() => onOpenChange(false)))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nombre *</FormLabel>
                  <FormControl><Input placeholder="Ej: Renta, Internet…" className="bg-white" {...field} /></FormControl>
                  <FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem><FormLabel>Monto *</FormLabel>
                    <FormControl><Input type="number" min="0" step="0.01" className="bg-white" {...field} /></FormControl>
                    <FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="frequency" render={({ field }) => (
                  <FormItem><FormLabel>Frecuencia</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(FREQ_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Categoría *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Selecciona…" /></SelectTrigger></FormControl>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notas / Detalles</FormLabel>
                  <FormControl><Textarea className="resize-none h-16 bg-white" placeholder="Información adicional…" {...field} /></FormControl>
                  <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="isActive" render={({ field }) => (
                <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
                  <Label>Activo en resumen mensual</Label>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </div>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" className="bg-red-700 hover:bg-red-800 text-white" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Guardando…" : expense ? "Actualizar" : "Crear"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
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
    .filter((e) => (e as any).isActive !== false && (e as any).active !== false)
    .reduce((s, e) => {
      const rawAmount = (e as any).amount ?? (e as any).monto ?? (e as any).monthlyAmount ?? (e as any).cost ?? 0;
      const amount = Number(rawAmount) || 0;
      const freq = (e as any).frequency ?? (e as any).frecuencia ?? "mensual";
      const m = freq === "quincenal" ? 2 : freq === "semanal" ? 4.33 : 1;
      return s + amount * m;
    }, 0);

  const handleSave = useCallback(async (values: FormValues, id?: string) => {
    try {
      if (id) { await updateDoc(doc(db, "fixedMonthlyExpenses", id), values); toast({ title: "Gasto actualizado" }); }
      else { await addDoc(collection(db, "fixedMonthlyExpenses"), values); toast({ title: "Gasto creado" }); }
    } catch { toast({ title: "Error al guardar", variant: "destructive" }); }
  }, [toast]);

  const handleDelete = useCallback(async (e: FixedExpense) => {
    try { await deleteDoc(doc(db, "fixedMonthlyExpenses", e.id)); toast({ title: "Eliminado" }); setDeleteTarget(null); }
    catch { toast({ title: "Error al eliminar", variant: "destructive" }); }
  }, [toast]);

  const handleToggleActive = useCallback(async (e: FixedExpense) => {
    const currentState = (e as any).isActive !== false && (e as any).active !== false;
    try { 
      await updateDoc(doc(db, "fixedMonthlyExpenses", e.id), { isActive: !currentState }); 
      toast({ title: currentState ? "Gasto desactivado" : "Gasto activado" }); 
    }
    catch { toast({ title: "Error al cambiar estado", variant: "destructive" }); }
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

        <Card className="overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="text-xs w-[200px]">Nombre</TableHead>
                <TableHead className="text-xs">Categoría</TableHead>
                <TableHead className="text-xs">Frecuencia</TableHead>
                <TableHead className="text-xs text-right">Monto</TableHead>
                <TableHead className="text-xs text-right">Equiv. Mensual</TableHead>
                <TableHead className="text-xs">Notas</TableHead>
                <TableHead className="text-xs text-center">Estado</TableHead>
                <TableHead className="text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fixedExpenses.length > 0 ? fixedExpenses.map((e) => {
                const rawAmount = (e as any).amount ?? (e as any).monto ?? (e as any).monthlyAmount ?? (e as any).cost ?? 0;
                const amount = Number(rawAmount) || 0;
                const freq = (e as any).frequency ?? (e as any).frecuencia ?? "mensual";
                const m = freq === "quincenal" ? 2 : freq === "semanal" ? 4.33 : 1;
                const isActive = (e as any).isActive !== false && (e as any).active !== false;
                const notes = (e as any).notes || (e as any).notas || "";

                return (
                  <TableRow key={e.id} className={cn("transition-all", !isActive && "opacity-50")}>
                    <TableCell>
                      <p className="font-semibold text-sm">{e.name}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] bg-muted/30">{e.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{FREQ_LABELS[freq] || "Mensual"}</TableCell>
                    <TableCell className="text-right font-bold text-sm text-primary">{formatCurrency(amount)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {freq !== "mensual" ? <span className="font-semibold">≈ {formatCurrency(amount * m)}</span> : <span>&mdash;</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate" title={notes}>
                      {notes || <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={isActive}
                          onCheckedChange={() => handleToggleActive(e)}
                          id={`switch-${e.id}`}
                        />
                        <span className={cn("text-[10px] font-semibold", isActive ? "text-emerald-600" : "text-muted-foreground")}>
                          {isActive ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditExpense(e); setDialogOpen(true); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setDeleteTarget(e)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Sin gastos fijos registrados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
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

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        expense={editExpense}
        onSave={handleSave}
      />
    </>
  );
}
