import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { placeholderDashboardMetrics } from "@/lib/placeholder-data";
import { Activity, Users, DollarSign, Package, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const metrics = placeholderDashboardMetrics;

  const kpiCards = [
    { title: "Servicios Activos", value: metrics.activeServices, icon: Activity, color: "text-blue-500", unit: "" },
    { title: "Ganancias Prom. Técnico", value: metrics.technicianEarnings, icon: Users, color: "text-green-500", unit: "$" },
    { title: "Ingresos Diarios", value: metrics.dailyRevenue, icon: DollarSign, color: "text-purple-500", unit: "$" },
    { title: "Alertas de Stock Bajo", value: metrics.lowStockAlerts, icon: Package, color: "text-orange-500", unit: "" },
  ];

  const quickAccessLinks = [
    { label: "Nuevo Servicio", path: "/servicios#nuevo", color: "bg-primary hover:bg-primary/90" },
    { label: "Registrar Venta", path: "/pos", color: "bg-accent hover:bg-accent/90 text-accent-foreground" },
    { label: "Ver Inventario", path: "/inventario", color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground" },
    { label: "Gestionar Vehículos", path: "/vehiculos", color: "bg-secondary hover:bg-secondary/80 text-secondary-foreground" },
  ];

  return (
    <div className="container mx-auto py-8">
      <PageHeader
        title="Panel Principal"
        description="Resumen general de la actividad del taller."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-headline">
                {kpi.unit}{kpi.value.toLocaleString('es-ES')}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle>Acceso Rápido</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickAccessLinks.map(link => (
            <Button key={link.path} asChild className={`w-full text-base py-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 ${link.color}`}>
              <Link href={link.path} className="flex items-center justify-center gap-2">
                {link.label} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Placeholder for future charts or more detailed sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Actividad Reciente (Próximamente)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Aquí se mostrará un resumen de las últimas actividades.</p>
             <div className="mt-4 h-48 bg-muted rounded-md flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Gráfico de actividad</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Notificaciones Importantes (Próximamente)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Aquí se mostrarán alertas y notificaciones.</p>
            <div className="mt-4 h-48 bg-muted rounded-md flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Lista de notificaciones</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
