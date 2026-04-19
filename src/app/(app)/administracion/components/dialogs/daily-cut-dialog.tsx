// src/app/(app)/administracion/components/dialogs/daily-cut-dialog.tsx
"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatCurrency, cn } from "@/lib/utils";
import { db } from "@/lib/firebaseClient";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Scissors, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { CashDrawerTransaction, User } from "@/types";

interface CutBreakdown {
  income: number;
  expenses: number;
  net: number;
  cash: { income: number; expenses: number; net: number };
  card: { income: number; expenses: number; net: number };
  transfer: { income: number; expenses: number; net: number };
  bySource: Record<string, { total: number; count: number }>;
  count: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: string;
  breakdown: CutBreakdown;
  currentUser: User | null;
  onSaved: () => void;
}

export function DailyCutDialog({ open, onOpenChange, date, breakdown, currentUser, onSaved }: Props) {
  const { toast } = useToast();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentUser) return toast({ title: "No autenticado", variant: "destructive" });
    setSaving(true);
    try {
      await addDoc(collection(db, "dailyCuts"), {
        date,
        income: breakdown.income,
        expenses: breakdown.expenses,
        netBalance: breakdown.net,
        breakdown: {
          cash: breakdown.cash,
          card: breakdown.card,
          transfer: breakdown.transfer,
        },
        bySource: breakdown.bySource,
        transactionCount: breakdown.count,
        closedBy: currentUser.id,
        closedByName: currentUser.name,
        notes: notes.trim() || null,
        closedAt: serverTimestamp(),
      });
      toast({ title: "✅ Corte guardado", description: `Corte del ${format(new Date(date + "T12:00:00"), "dd 'de' MMMM yyyy", { locale: es })} cerrado correctamente.` });
      onSaved();
      onOpenChange(false);
      setNotes("");
    } catch {
      toast({ title: "Error al guardar corte", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = (() => {
    try { return format(new Date(date + "T12:00:00"), "EEEE dd 'de' MMMM yyyy", { locale: es }); }
    catch { return date; }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" /> Cerrar Corte del Día
          </DialogTitle>
          <DialogDescription className="capitalize">{formattedDate}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Ingresos", value: breakdown.income, color: "text-emerald-600" },
              { label: "Egresos", value: breakdown.expenses, color: "text-red-600" },
              { label: "Neto", value: breakdown.net, color: breakdown.net >= 0 ? "text-emerald-600" : "text-red-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-muted/50 rounded-xl p-3 text-center border">
                <p className={cn("text-lg font-black", color)}>{formatCurrency(value)}</p>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* By method */}
          <div className="space-y-1 text-sm border rounded-xl p-3">
            <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Por Método de Pago</p>
            {(["cash", "card", "transfer"] as const).map((method) => {
              const labels = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" };
              const b = breakdown[method];
              return (
                <div key={method} className="flex justify-between items-center py-1 border-b last:border-0">
                  <span className="text-muted-foreground">{labels[method]}</span>
                  <span className={cn("font-bold", b.net >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {formatCurrency(b.net)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Transactions count */}
          <p className="text-sm text-muted-foreground text-center">
            {breakdown.count} transacciones registradas
          </p>

          {/* Notes */}
          <div>
            <Label htmlFor="cut-notes" className="text-sm">Notas del Corte (opcional)</Label>
            <Textarea
              id="cut-notes"
              placeholder="Observaciones, diferencias, notas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {saving ? "Guardando…" : "Cerrar Corte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
