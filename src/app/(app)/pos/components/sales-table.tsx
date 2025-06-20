
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
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge"; // Import BadgeProps
import type { SaleReceipt } from "@/types";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Printer } from "lucide-react";

interface SalesTableProps {
  sales: SaleReceipt[];
  onReprintTicket: (sale: SaleReceipt) => void;
}

export function SalesTable({ sales, onReprintTicket }: SalesTableProps) {
  if (!sales.length) {
    return <p className="text-muted-foreground text-center py-8">No hay ventas registradas que coincidan con los filtros.</p>;
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPaymentMethodVariant = (method?: SaleReceipt['paymentMethod']): BadgeProps['variant'] => {
    switch (method) {
      case "Efectivo": return "success";
      case "Tarjeta": return "purple";
      case "Transferencia": return "blue";
      case "Efectivo+Transferencia": return "lightGreen";
      case "Tarjeta+Transferencia": return "lightPurple";
      default: return "outline";
    }
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
            <TableHead className="text-right">Acciones</TableHead>
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
                  <Badge variant={getPaymentMethodVariant(sale.paymentMethod)}>
                    {sale.paymentMethod}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(sale.subTotal)}</TableCell>
                <TableCell className="text-right">{formatCurrency(sale.tax || 0)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(sale.totalAmount)}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onReprintTicket(sale)} title="Reimprimir Ticket">
                    <Printer className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
