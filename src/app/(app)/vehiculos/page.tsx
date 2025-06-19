import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { VehiclesTable } from "./components/vehicles-table";
import { VehicleDialog } from "./components/vehicle-dialog";
import { placeholderVehicles, placeholderServiceRecords } from "@/lib/placeholder-data";

export default function VehiculosPage() {
  const vehicles = placeholderVehicles.map(v => ({
    ...v,
    serviceHistory: placeholderServiceRecords.filter(s => s.vehicleId === v.id)
  }));

  return (
    <>
      <PageHeader
        title="Gestión de Vehículos"
        description="Administra la información de los vehículos y su historial de servicios."
        actions={
          <VehicleDialog 
            trigger={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Vehículo
              </Button>
            }
          />
        }
      />
      <VehiclesTable vehicles={vehicles} />
    </>
  );
}
