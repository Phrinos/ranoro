
"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { SaleReceipt } from "@/types";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

interface SalesTableProps {
  sales: SaleReceipt[];
}

export function SalesTable({ sales }: SalesTableProps) {
  if (!sales.length) {
    return <p className="text-muted-foreground text-center py-8">No hay ventas registradas que coincidan con los filtros.</p>;
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID Venta</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-center"># Artículos</TableHead>
            <TableHead>Método Pago</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
            <TableHead className="text-right">Impuestos</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => {
            const saleDate = parseISO(sale.saleDate);
            const formattedDate = isValid(saleDate) 
              ? format(saleDate, "dd MMM yyyy, HH:mm", { locale: es }) 
              : 'Fecha Inválida';
            
            return (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">{sale.id}</TableCell>
                <TableCell>{formattedDate}</TableCell>
                <TableCell>{sale.customerName || 'N/A'}</TableCell>
                <TableCell className="text-center">{sale.items.length}</TableCell>
                <TableCell>
                  <Badge variant={sale.paymentMethod === "Efectivo" ? "secondary" : sale.paymentMethod === "Tarjeta" ? "default" : "outline"}>
                    {sale.paymentMethod}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(sale.subTotal)}</TableCell>
                <TableCell className="text-right">{formatCurrency(sale.tax || 0)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(sale.totalAmount)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
