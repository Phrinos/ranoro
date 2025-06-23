
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { format, parseISO, isToday, isFuture, isValid, compareAsc, isSameDay } from "date-fns";
import { es } from 'date-fns/locale';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory, placeholderSales, calculateSaleProfit, IVA_RATE } from "@/lib/placeholder-data";
import type { ServiceRecord, Vehicle, Technician, InventoryItem, User, QuoteRecord, PurchaseRecommendation, SaleReceipt } from "@/types";
import { Badge } from "@/components/ui/badge";
import { User as UserIcon, Wrench, CheckCircle, CalendarClock, Clock, AlertTriangle, ShoppingCart, BrainCircuit, Loader2, Printer, DollarSign, TrendingUp } from "lucide-react"; 
import { ServiceDialog } from "../servicios/components/service-dialog";
import { useToast } from "@/hooks/use-toast";
import { getPurchaseRecommendations, type PurchaseRecommendationOutput } from '@/ai/flows/purchase-recommendation-flow';
import { PrintTicketDialog } from '@/components/ui/print-ticket-dialog';
import { PurchaseOrderContent } from './components/purchase-order-content';
import { Button } from "@/components/ui/button";


interface EnrichedServiceRecord extends ServiceRecord {
  vehicleInfo?: string;
  technicianName?: string;
}

const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const DashboardServiceSection = ({ 
  title, 
  services, 
  icon: IconCmp, 
  emptyMessage,
  isLoading,
  onServiceClick 
}: { 
  title: string, 
  services: EnrichedServiceRecord[], 
  icon: React.ElementType, 
  emptyMessage: string,
  isLoading: boolean,
  onServiceClick: (service: EnrichedServiceRecord) => void; 
}) => (
  <Card className="flex flex-col shadow-lg">
    <CardHeader className="pb-3 sticky top-0 bg-card z-10 border-b">
      <CardTitle className="text-lg font-semibold flex items-center gap-2">
        <IconCmp className="h-5 w-5 text-primary shrink-0" />
        <span>{title} ({services.length})</span>
      </CardTitle>
    </CardHeader>
    <CardContent className="p-2 space-y-2">
      {isLoading && services.length === 0 ? (
          Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="p-2.5 animate-pulse w-full"> 
            <div className="flex gap-3"> 
              <div className="flex-grow space-y-1.5"> 
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="flex justify-between">
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
              </div>
            </div>
          </Card>
        ))
      ) : services.length > 0 ? (
        services.map((service) => {
          let statusVariant: "default" | "secondary" | "outline" | "destructive" | "success" = "default";
          if (service.status === "Reparando") statusVariant = "secondary";
          else if (service.status === "Completado") statusVariant = "success";
          else if (service.status === "Cancelado") statusVariant = "destructive";
          
          const totalCostFormatted = formatCurrency(service.totalCost);
          const serviceProfitFormatted = formatCurrency(service.serviceProfit || 0);
          const serviceDateObj = service.serviceDate ? parseISO(service.serviceDate) : null;
          const deliveryDateObj = service.deliveryDateTime ? parseISO(service.deliveryDateTime) : null;
          const serviceReceptionTime = serviceDateObj && isValid(serviceDateObj) ? format(serviceDateObj, "HH:mm", { locale: es }) : 'N/A';
          const formattedDeliveryDateTime = deliveryDateObj && isValid(deliveryDateObj) ? format(deliveryDateObj, "dd MMM yy, HH:mm", { locale: es }) : 'N/A';


          return (
            <Card 
                key={service.id} 
                className="w-full shadow-sm hover:shadow-md transition-shadow duration-150 cursor-pointer hover:bg-muted/50"
                onClick={() => onServiceClick(service)}
              >
              <CardContent className="p-0">
                <div className="flex items-center">
                    <div className="w-48 shrink-0 flex flex-col justify-center items-start text-left pl-6 py-4">
                        <p className="font-bold text-lg text-foreground">
                            {totalCostFormatted}
                        </p>
                        <p className="text-xs text-muted-foreground -mt-1">Costo</p>
                        <p className="font-semibold text-lg text-green-600 mt-1">
                            {serviceProfitFormatted}
                        </p>
                        <p className="text-xs text-muted-foreground -mt-1">Ganancia</p>
                    </div>
                    
                    <div className="flex-grow border-l border-r p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5" title="Hora de Recepción">
                                {(service.status === 'Reparando' || service.status === 'Completado') ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4" />}
                                <span>Recepción: {serviceReceptionTime}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Técnico">
                                <Wrench className="h-4 w-4" />
                                <span>{service.technicianName}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Fecha de Entrega">
                                {service.status === 'Completado' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <CalendarClock className="h-4 w-4" />}
                                <span>Entrega: {formattedDeliveryDateTime}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="ID de Servicio">
                                <span>ID: {service.id}</span>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-4">
                            <div className="flex-grow">
                                <h4 className="font-semibold text-lg" title={service.vehicleInfo}>
                                    {service.vehicleInfo}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1 truncate" title={service.description}>
                                    {service.description}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="w-48 shrink-0 flex flex-col items-center justify-center p-4 gap-y-2">
                        <Badge variant={statusVariant} className="w-full justify-center text-center text-base">{service.status}</Badge>
                    </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <p className="text-muted-foreground text-center py-10">{emptyMessage}</p>
      )}
    </CardContent>
  </Card>
);


export default function DashboardPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [repairingServices, setRepairingServices] = useState<EnrichedServiceRecord[]>([]);
  const [scheduledServices, setScheduledServices] = useState<EnrichedServiceRecord[]>([]);
  const [completedTodayServices, setCompletedTodayServices] = useState<EnrichedServiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [vehicles, setVehiclesState] = useState<Vehicle[]>(placeholderVehicles);
  const [technicians, setTechniciansState] = useState<Technician[]>(placeholderTechnicians);
  const [inventoryItems, setInventoryItemsState] = useState<InventoryItem[]>(placeholderInventory);
  
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [selectedServiceForDialog, setSelectedServiceForDialog] = useState<ServiceRecord | null>(null);
  const { toast } = useToast();

  const [purchaseRecommendations, setPurchaseRecommendations] = useState<PurchaseRecommendation[] | null>(null);
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isPurchaseOrderDialogOpen, setIsPurchaseOrderDialogOpen] = useState(false);
  const [workshopName, setWorkshopName] = useState<string>('RANORO');

  const purchaseOrderRef = useRef<HTMLDivElement>(null);

  const [kpiData, setKpiData] = useState({
    dailyRevenue: 0,
    dailyProfit: 0,
    activeServices: 0,
    lowStockAlerts: 0,
  });

  const loadAndFilterServices = useCallback(() => {
    setIsLoading(true);
    const clientToday = new Date();

    const enrichedServices = placeholderServiceRecords.map(service => {
      const vehicle = vehicles.find(v => v.id === service.vehicleId);
      const technician = technicians.find(t => t.id === service.technicianId);
      return {
        ...service,
        vehicleInfo: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})` : `Vehículo ID: ${service.vehicleId}`,
        technicianName: technician ? technician.name : `Técnico ID: ${service.technicianId}`,
      };
    });

    const repairing = enrichedServices.filter(s => s.status === 'Reparando');
    
    const scheduled = enrichedServices.filter(s => {
      if (s.status !== 'Agendado') return false;
      try {
        const serviceDay = parseISO(s.serviceDate);
        return isValid(serviceDay) && (isToday(serviceDay) || isFuture(serviceDay));
      } catch (e) {
        console.error("Error parsing service date for scheduled services:", s.serviceDate, e);
        return false; 
      }
    }).sort((a,b) => compareAsc(parseISO(a.serviceDate), parseISO(b.serviceDate)));
    
    const completedToday = enrichedServices.filter(s => {
      if (s.status !== 'Completado') return false;
      try {
        const completionOrServiceDate = s.deliveryDateTime || s.serviceDate;
        const serviceDay = parseISO(completionOrServiceDate); 
        return isValid(serviceDay) && isToday(serviceDay);
      } catch (e) {
        console.error("Error parsing service date for completed today:", s.serviceDate, e);
        return (s.deliveryDateTime || s.serviceDate).startsWith(format(clientToday, 'yyyy-MM-dd'));
      }
    });

    setRepairingServices(repairing);
    setScheduledServices(scheduled);
    setCompletedTodayServices(completedToday);
    
    // --- KPI Calculations ---
    const salesToday = placeholderSales.filter(s => isSameDay(parseISO(s.saleDate), clientToday));
    const servicesCompletedToday = placeholderServiceRecords.filter(s => s.status === 'Completado' && s.deliveryDateTime && isSameDay(parseISO(s.deliveryDateTime), clientToday));
    
    const revenueFromSales = salesToday.reduce((sum, s) => sum + s.totalAmount, 0);
    const revenueFromServices = servicesCompletedToday.reduce((sum, s) => sum + s.totalCost, 0);
    
    const profitFromSales = salesToday.reduce((sum, s) => sum + calculateSaleProfit(s, placeholderInventory, IVA_RATE), 0);
    const profitFromServices = servicesCompletedToday.reduce((sum, s) => sum + (s.serviceProfit || 0), 0);

    setKpiData({
        dailyRevenue: revenueFromSales + revenueFromServices,
        dailyProfit: profitFromSales + profitFromServices,
        activeServices: repairing.length + scheduled.filter(s => isToday(parseISO(s.serviceDate))).length,
        lowStockAlerts: placeholderInventory.filter(item => !item.isService && item.quantity <= item.lowStockThreshold).length
    });
    
    setIsLoading(false);
  }, [vehicles, technicians]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authUserString = localStorage.getItem('authUser');
      if (authUserString) {
        try {
          const authUser: User = JSON.parse(authUserString);
          setUserName(authUser.name);
        } catch (e) {
          console.error("Failed to parse authUser for dashboard welcome message:", e);
          setUserName(null);
        }
      } else {
         setUserName(null);
      }
      const stored = localStorage.getItem('workshopTicketInfo');
      if (stored) {
        try {
          const info = JSON.parse(stored);
          if (info.name) setWorkshopName(info.name);
        } catch (e) {
          console.error("Failed to parse workshop info", e);
        }
      }
    }
    loadAndFilterServices();
  }, [loadAndFilterServices]);

  const handleOpenServiceDialog = (service: EnrichedServiceRecord) => {
    const originalService = placeholderServiceRecords.find(s => s.id === service.id);
    if (originalService) {
        setSelectedServiceForDialog(originalService);
        setIsServiceDialogOpen(true);
    } else {
        toast({
            title: "Error",
            description: "No se pudo encontrar el servicio original para mostrar detalles.",
            variant: "destructive"
        });
    }
  };
  
  const handleUpdateService = async (data: ServiceRecord | QuoteRecord) => {
    if (!('status' in data)) {
      toast({title: "Error de Tipo", description: "Se esperaba actualizar un servicio.", variant: "destructive"});
      return;
    }
    const updatedServiceData = data as ServiceRecord;

    const pIndex = placeholderServiceRecords.findIndex(s => s.id === updatedServiceData.id);
    if (pIndex !== -1) {
      placeholderServiceRecords[pIndex] = updatedServiceData;
    }
    loadAndFilterServices(); 
    toast({
      title: "Servicio Actualizado",
      description: `El servicio ${updatedServiceData.id} ha sido actualizado.`,
    });
    setIsServiceDialogOpen(false);
    setSelectedServiceForDialog(null);
  };

  const onVehicleCreated = (newVehicle: Vehicle) => {
    setVehiclesState(currentVehicles => {
      if (currentVehicles.find(v => v.id === newVehicle.id)) return currentVehicles;
      const updated = [...currentVehicles, newVehicle];
      if (!placeholderVehicles.find(v => v.id === newVehicle.id)) {
         placeholderVehicles.push(newVehicle);
      }
      return updated;
    });
    toast({ title: "Vehículo Registrado", description: `El vehículo ${newVehicle.licensePlate} ha sido agregado.` });
  };
  
  const handleGeneratePurchaseOrder = async () => {
    setIsPurchaseLoading(true);
    setPurchaseError(null);
    setPurchaseRecommendations(null);

    try {
      const today = new Date();
      const servicesForToday = placeholderServiceRecords.filter(s => {
        const serviceDay = parseISO(s.serviceDate);
        return isValid(serviceDay) && isToday(serviceDay) && s.status !== 'Completado' && s.status !== 'Cancelado';
      });

      if (servicesForToday.length === 0) {
        toast({ title: "No hay servicios", description: "No hay servicios agendados para hoy que requieran compras.", variant: 'default' });
        setIsPurchaseLoading(false);
        return;
      }
      
      const input = {
        scheduledServices: servicesForToday.map(s => ({ id: s.id, description: s.description })),
        inventoryItems: placeholderInventory.map(i => ({ id: i.id, name: i.name, quantity: i.quantity, supplier: i.supplier })),
        serviceHistory: placeholderServiceRecords.map(s => ({
            description: s.description,
            suppliesUsed: s.suppliesUsed.map(sup => ({ supplyName: sup.supplyName || placeholderInventory.find(i => i.id === sup.supplyId)?.name || 'Unknown' }))
        }))
      };

      const result = await getPurchaseRecommendations(input);
      setPurchaseRecommendations(result.recommendations);
      toast({ title: "Orden de Compra Generada", description: result.reasoning, duration: 6000 });
      setIsPurchaseOrderDialogOpen(true);

    } catch (e) {
      console.error(e);
      setPurchaseError("La IA no pudo generar la orden de compra. Por favor, inténtelo de nuevo más tarde.");
      toast({
        title: "Error de IA",
        description: "No se pudo generar la orden de compra.",
        variant: "destructive"
      });
    } finally {
      setIsPurchaseLoading(false);
    }
  };


  return (
    <div className="container mx-auto py-8 flex flex-col">
      <PageHeader
        title={userName ? `¡Bienvenido, ${userName}!` : "Panel Principal de Taller"}
        description="Vista del estado actual de los servicios y herramientas de IA."
      />

       <div className="mb-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos del Día</CardTitle>
            <DollarSign className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{formatCurrency(kpiData.dailyRevenue)}</div>
            <p className="text-xs text-muted-foreground">Ganancia del día: {formatCurrency(kpiData.dailyProfit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Servicios Activos (Hoy)</CardTitle>
            <Wrench className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{kpiData.activeServices}</div>
            <p className="text-xs text-muted-foreground">Reparando y agendados para hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas de Stock Bajo</CardTitle>
            <AlertTriangle className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{kpiData.lowStockAlerts}</div>
            <p className="text-xs text-muted-foreground">Ítems que necesitan reposición</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ganancia del día (Beta)</CardTitle>
            <TrendingUp className="h-5 w-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{formatCurrency(kpiData.dailyProfit)}</div>
            <p className="text-xs text-muted-foreground">Estimación basada en ventas y servicios</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mb-6 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BrainCircuit className="h-5 w-5 text-purple-500" />
              Asistente de Compras IA
            </CardTitle>
            <CardDescription>
              Genera una orden de compra consolidada para los servicios de hoy.
            </CardDescription>
          </div>
          <Button onClick={handleGeneratePurchaseOrder} disabled={isPurchaseLoading}>
            {isPurchaseLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
            {isPurchaseLoading ? 'Analizando...' : 'Generar Orden de Compra'}
          </Button>
        </CardHeader>
        {purchaseError && (
          <CardContent>
            <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm">{purchaseError}</span>
            </div>
          </CardContent>
        )}
      </Card>


      <div className="flex flex-col gap-6">
        <DashboardServiceSection 
          title="En Reparación" 
          services={repairingServices} 
          icon={Wrench}
          emptyMessage="No hay servicios en reparación actualmente."
          isLoading={isLoading}
          onServiceClick={handleOpenServiceDialog}
        />
        <DashboardServiceSection 
          title="Agendados (Hoy/Futuro)" 
          services={scheduledServices} 
          icon={CalendarClock}
          emptyMessage="No hay servicios agendados."
          isLoading={isLoading}
          onServiceClick={handleOpenServiceDialog}
        />
        <DashboardServiceSection 
          title="Completados Hoy" 
          services={completedTodayServices} 
          icon={CheckCircle}
          emptyMessage="No se han completado servicios hoy."
          isLoading={isLoading}
          onServiceClick={handleOpenServiceDialog}
        />
      </div>
      {isServiceDialogOpen && selectedServiceForDialog && (
        <ServiceDialog
          open={isServiceDialogOpen}
          onOpenChange={setIsServiceDialogOpen}
          service={selectedServiceForDialog}
          vehicles={vehicles}
          technicians={technicians}
          inventoryItems={inventoryItems}
          onSave={handleUpdateService}
          onVehicleCreated={onVehicleCreated}
        />
      )}

      {purchaseRecommendations && (
        <PrintTicketDialog
            open={isPurchaseOrderDialogOpen}
            onOpenChange={setIsPurchaseOrderDialogOpen}
            title="Orden de Compra Sugerida por IA"
            onDialogClose={() => setPurchaseRecommendations(null)}
            dialogContentClassName="printable-quote-dialog"
            footerActions={
              <Button onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Imprimir Orden
              </Button>
            }
          >
            <PurchaseOrderContent
              ref={purchaseOrderRef}
              recommendations={purchaseRecommendations}
              workshopName={workshopName}
            />
        </PrintTicketDialog>
      )}
    </div>
  );
}
