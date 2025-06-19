import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ServicesTable } from "./components/services-table";
import { ServiceDialog } from "./components/service-dialog";
import { placeholderServiceRecords, placeholderVehicles, placeholderTechnicians, placeholderInventory } from "@/lib/placeholder-data";

export default function ServiciosPage() {
  // In a real app, these would be fetched
  const services = placeholderServiceRecords;
  const vehicles = placeholderVehicles;
  const technicians = placeholderTechnicians;
  const inventoryItems = placeholderInventory;

  return (
    <>
      <PageHeader
        title="Gestión de Servicios"
        description="Visualiza, crea y actualiza las órdenes de servicio."
        actions={
          <ServiceDialog
            vehicles={vehicles}
            technicians={technicians}
            inventoryItems={inventoryItems}
            trigger={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Servicio
              </Button>
            }
          />
        }
      />
      <ServicesTable 
        services={services} 
        vehicles={vehicles}
        technicians={technicians}
        inventoryItems={inventoryItems}
      />
    </>
  );
}
