"use client";

// ── InvoicesListTab ──────────────────────────────────────────────────────────
// Placeholder UI — pending Facturapi SDK integration via billingService.
// Will display historical invoices once the server action is wired.
// ────────────────────────────────────────────────────────────────────────────

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileJson } from "lucide-react";

export function InvoicesListTab() {
  return (
    <Card className="shadow-xs">
      <CardHeader className="pb-4">
        <CardTitle>Historial de Facturas</CardTitle>
        <CardDescription>Facturas emitidas desde tu portal y caja.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Folio Ticket</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileJson className="h-8 w-8 opacity-30" />
                    <p className="text-sm font-medium">Sin facturas generadas aún.</p>
                    <p className="text-xs">Las facturas emitidas aparecerán aquí.</p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
