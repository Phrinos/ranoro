"use client";

// ── InvoicesListTab ──────────────────────────────────────────────────────────
// Placeholder UI — pending Facturapi SDK integration via billingService.
// Will display historical invoices once the server action is wired.
// ────────────────────────────────────────────────────────────────────────────

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileJson, FileText, Code, Loader2, Car, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { getInvoicedTicketsAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export function InvoicesListTab() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    getInvoicedTicketsAction()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setInvoices(res.data);
        } else if (res.error) {
          toast({ title: "Error", description: res.error, variant: "destructive" });
        }
      })
      .catch(() => {
        if (isMounted) toast({ title: "Error", description: "Fallo al cargar facturas.", variant: "destructive" });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [toast]);

  const formatDate = (dateObj: any) => {
    if (!dateObj) return 'N/A';
    try {
      const d = new Date(dateObj._seconds ? dateObj._seconds * 1000 : dateObj);
      return d.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <Card className="shadow-xs border-slate-200">
      <CardHeader className="pb-4 bg-muted/20 border-b border-slate-100">
        <CardTitle className="text-xl text-primary">Historial de Facturas</CardTitle>
        <CardDescription>Consulta y descarga las facturas emitidas desde tu portal y caja (Incluyendo pruebas locales).</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b border-slate-200">
              <TableRow>
                <TableHead className="font-bold text-slate-600 text-xs uppercase tracking-wider w-[200px]">Detalle de Operación</TableHead>
                <TableHead className="font-bold text-slate-600 text-xs uppercase tracking-wider w-[250px]">Datos del Servicio</TableHead>
                <TableHead className="font-bold text-slate-600 text-xs uppercase tracking-wider min-w-[250px]">Datos Fiscales (Receptor)</TableHead>
                <TableHead className="text-right font-bold text-slate-600 text-xs uppercase tracking-wider w-[150px]">Comprobantes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-40">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
                      <p className="text-sm font-medium">Cargando facturas...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-40">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <div className="bg-slate-100 p-4 rounded-full">
                        <FileJson className="h-8 w-8 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Sin facturas emitidas</p>
                        <p className="text-xs text-slate-500 mt-1">Las facturas procesadas aparecerán aquí.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.invoiceId} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell className="align-top py-5">
                      <div className="font-bold text-slate-800 mb-1">{formatDate(inv.date)}</div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Folio: {inv.folio}</div>
                      <Badge variant={inv.status === 'valid' ? 'success' : 'secondary'} className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5">
                        {inv.status === 'valid' ? 'Timbrada' : inv.status}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="align-top py-5">
                      <div className="font-bold text-slate-800 text-sm mb-1">{inv.customer}</div>
                      <div className="text-xs text-slate-500 mb-3 flex items-center gap-1.5 font-medium">
                        <Car className="h-3.5 w-3.5 text-slate-400"/> 
                        {inv.type === 'service' ? 'Servicio de Taller' : 'Venta General'}
                      </div>
                      <div className="text-sm font-black text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md w-fit shadow-xs">
                        Total: <span className="text-red-600 ml-1">{formatCurrency(inv.total)}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="align-top py-5">
                      {inv.billingData ? (
                        <div className="space-y-2 text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-black text-slate-800 uppercase tracking-wider text-[13px]">{inv.billingData.rfc}</span>
                            <span className="text-slate-600 font-medium truncate max-w-[250px]">{inv.billingData.name}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Uso CFDI</span>
                               <span className="text-slate-700 font-bold">{inv.billingData.cfdiUse}</span>
                            </div>
                            <div>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">C.P.</span>
                               <span className="text-slate-700 font-bold">{inv.billingData.address?.zip}</span>
                            </div>
                          </div>
                          <div className="mt-3 text-[10px] font-bold text-slate-600 bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-md w-fit inline-flex items-center gap-1.5 uppercase tracking-wider">
                            <Receipt className="h-3 w-3" /> Pago en una sola exhibición (PUE)
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic bg-slate-50 border border-slate-100 p-3 rounded-lg">
                          Datos de facturación no disponibles localmente.
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell className="align-top text-right py-5">
                      {inv.invoiceId ? (
                        <div className="flex flex-col items-end gap-2.5">
                          <Button asChild size="sm" variant="outline" className="h-9 px-4 text-xs font-black text-red-600 border-red-200 bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-700 shadow-xs w-28 transition-all">
                            <a href={`/api/invoices/${inv.invoiceId}/download?type=pdf`} target="_blank" rel="noreferrer">
                              <FileText className="h-4 w-4 mr-2" /> PDF
                            </a>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="h-9 px-4 text-xs font-black text-blue-600 border-blue-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 shadow-xs w-28 transition-all">
                            <a href={`/api/invoices/${inv.invoiceId}/download?type=xml`} target="_blank" rel="noreferrer">
                              <Code className="h-4 w-4 mr-2" /> XML
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Descargas no disponibles</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
