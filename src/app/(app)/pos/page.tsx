import { PageHeader } from "@/components/page-header";
import { PosForm } from "./components/pos-form";
import { placeholderInventory, placeholderSales } from "@/lib/placeholder-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export default function POSPage() {
  const inventoryItems = placeholderInventory;
  const recentSales = placeholderSales; // Placeholder for recent sales display

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <PageHeader
          title="Punto de Venta (POS)"
          description="Registra ventas de repuestos y servicios rápidos."
        />
        <PosForm inventoryItems={inventoryItems} />
      </div>
      <div className="md:col-span-1">
        <Card className="mt-0 md:mt-[76px]"> {/* Align with PageHeader roughly */}
          <CardHeader>
            <CardTitle>Ventas Recientes</CardTitle>
            <CardDescription>Últimas transacciones registradas.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {recentSales.length > 0 ? (
                <ul className="space-y-4">
                  {recentSales.map(sale => (
                    <li key={sale.id} className="p-3 border rounded-md shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-sm">ID Venta: {sale.id}</span>
                        <span className="text-xs text-muted-foreground">{format(parseISO(sale.saleDate), "dd MMM yyyy, HH:mm", { locale: es })}</span>
                      </div>
                      {sale.customerName && <p className="text-xs text-muted-foreground">Cliente: {sale.customerName}</p>}
                      <ul className="text-xs mt-1">
                        {sale.items.map(item => (
                          <li key={item.inventoryItemId}>{item.quantity}x {item.itemName} - ${item.totalPrice.toLocaleString('es-ES')}</li>
                        ))}
                      </ul>
                      <p className="text-right font-semibold text-sm mt-2">Total: ${sale.totalAmount.toLocaleString('es-ES')}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No hay ventas recientes.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
