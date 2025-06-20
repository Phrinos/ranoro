
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { FixedExpenseForm, type FixedExpenseFormValues } from "./fixed-expense-form";
import type { MonthlyFixedExpense } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { placeholderFixedMonthlyExpenses } from '@/lib/placeholder-data'; // Import the placeholder

interface FixedExpensesDialogProps {
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onExpensesUpdated: (updatedExpenses: MonthlyFixedExpense[]) => void;
}

export function FixedExpensesDialog({ 
  open, 
  onOpenChange,
  onExpensesUpdated,
}: FixedExpensesDialogProps) {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<MonthlyFixedExpense[]>([]);
  const [isSubFormOpen, setIsSubFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<MonthlyFixedExpense | null>(null);

  useEffect(() => {
    // Load current expenses when dialog opens or placeholder data changes
    if (open) {
      setExpenses([...placeholderFixedMonthlyExpenses]); // Create a mutable copy
    }
  }, [open]);

  const handleOpenSubForm = (expense?: MonthlyFixedExpense) => {
    setEditingExpense(expense || null);
    setIsSubFormOpen(true);
  };

  const handleSaveExpense = (values: FixedExpenseFormValues) => {
    let updatedExpensesList: MonthlyFixedExpense[];
    if (editingExpense) {
      updatedExpensesList = expenses.map(exp =>
        exp.id === editingExpense.id ? { ...editingExpense, ...values } : exp
      );
      toast({ title: "Gasto Actualizado", description: `El gasto "${values.name}" ha sido actualizado.` });
    } else {
      const newExpense: MonthlyFixedExpense = {
        id: `exp_${Date.now()}`,
        ...values,
      };
      updatedExpensesList = [...expenses, newExpense];
      toast({ title: "Gasto Agregado", description: `El gasto "${values.name}" ha sido agregado.` });
    }
    setExpenses(updatedExpensesList);
    placeholderFixedMonthlyExpenses.splice(0, placeholderFixedMonthlyExpenses.length, ...updatedExpensesList); // Update global placeholder
    onExpensesUpdated(updatedExpensesList);
    setIsSubFormOpen(false);
    setEditingExpense(null);
  };

  const handleDeleteExpense = (expenseId: string) => {
    const expenseToDelete = expenses.find(exp => exp.id === expenseId);
    const updatedExpensesList = expenses.filter(exp => exp.id !== expenseId);
    setExpenses(updatedExpensesList);
    placeholderFixedMonthlyExpenses.splice(0, placeholderFixedMonthlyExpenses.length, ...updatedExpensesList); // Update global placeholder
    onExpensesUpdated(updatedExpensesList);
    toast({ title: "Gasto Eliminado", description: `El gasto "${expenseToDelete?.name}" ha sido eliminado.` });
  };
  
  const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gestionar Gastos Fijos Mensuales</DialogTitle>
          <DialogDescription>
            Añade, edita o elimina los gastos fijos recurrentes de tu taller.
          </DialogDescription>
        </DialogHeader>
        
        {isSubFormOpen ? (
          <FixedExpenseForm
            initialData={editingExpense}
            onSubmit={handleSaveExpense}
            onClose={() => {
              setIsSubFormOpen(false);
              setEditingExpense(null);
            }}
          />
        ) : (
          <>
            <Button onClick={() => handleOpenSubForm()} className="mb-4 self-start">
              <PlusCircle className="mr-2 h-4 w-4" />
              Añadir Gasto
            </Button>
            {expenses.length > 0 ? (
              <ScrollArea className="flex-grow border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre del Gasto</TableHead>
                      <TableHead className="text-right">Monto Mensual</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenSubForm(expense)} className="mr-1">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(expense.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-center py-4 flex-grow">No hay gastos fijos registrados.</p>
            )}
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
