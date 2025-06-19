import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { VehiclesTable } from "./components/vehicles-table";
import { VehicleDialog } from "./components/vehicle-dialog";
import { placeholderVehicles as allVehicles, placeholderServiceRecords } from "@/lib/placeholder-data";
import type { Vehicle } from "@/types";


export default function VehiculosPage() {
  // Vehicle IDs are now numbers, serviceHistory mapping should still work.
  const vehicles: Vehicle[] = allVehicles.map(v => ({
    ...v,
    serviceHistory: placeholderServiceRecords.filter(s => s.vehicleId === v.id)
  }));

  // onSave for dialog can be simplified or passed to a context/global state if needed
  // For now, local mutation or re-fetch would be typical. Placeholder data doesn't persist.
  const handleSaveVehicle = async (data: any) => {
    // console.log("Vehicle saved/updated (placeholder):", data);
    // In a real app, you'd update your state or refetch.
    // For this example, we won't re-render the table from here as changes are local to dialog.
  };


  return (
    <>
      <PageHeader
        title="Vehículos" // Changed title
        description="Administra la información de los vehículos y su historial de servicios."
        actions={
          <VehicleDialog
            trigger={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Vehículo
              </Button>
            }
            onSave={handleSaveVehicle} // Example save handler
          />
        }
      />
      <VehiclesTable vehicles={vehicles} />
    </>
  );
}
