
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
import { Badge } from "@/components/ui/badge"; 
import type { SaleReceipt, InventoryItem } from "@/types";
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { Printer } from "lucide-react";
import { calculateSaleProfit, IVA_RATE } from "@/lib/placeholder-data";

interface SalesTableProps {
  sales: SaleReceipt[];
  onReprintTicket: (sale: SaleReceipt) => void;
  inventoryItems: InventoryItem[];
}

// Explicitly define the allowed badge variants as a string literal union type
type BadgeVariantType =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "purple"
  | "blue"
  | "lightGreen"
  | "lightPurple";

export function SalesTable({ sales, onReprintTicket, inventoryItems }: SalesTableProps) {
  if (!sales.length) {
    return <p className="text-muted-foreground text-center py-8">No hay ventas registradas que coincidan con los filtros.</p>;
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPaymentMethodVariant = (method?: SaleReceipt['paymentMethod']): BadgeVariantType => {
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
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader className="bg-white">
          <TableRow>
            <TableHead className="font-bold">ID Venta</TableHead>
            <TableHead className="font-bold">Fecha</TableHead>
            <TableHead className="font-bold">Cliente</TableHead>
            <TableHead className="font-bold"># Artículos</TableHead>
            <TableHead className="font-bold">Método Pago</TableHead>
            <TableHead className="text-right font-bold">Total</TableHead>
            <TableHead className="text-right font-bold">Ganancia</TableHead>
            <TableHead className="text-right font-bold">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => {
            const saleDate = parseISO(sale.saleDate);
            const formattedDate = isValid(saleDate)
              ? format(saleDate, "dd MMM yyyy, HH:mm", { locale: es })
              : 'Fecha Inválida';
            
            const profit = calculateSaleProfit(sale, inventoryItems, IVA_RATE);

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
                <TableCell className="text-right font-semibold">{formatCurrency(sale.totalAmount)}</TableCell>
                <TableCell className="text-right font-semibold text-green-600">{formatCurrency(profit)}</TableCell>
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
