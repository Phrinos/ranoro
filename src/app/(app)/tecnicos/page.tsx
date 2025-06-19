import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { TechniciansTable } from "./components/technicians-table";
import { TechnicianDialog } from "./components/technician-dialog";
import { placeholderTechnicians } from "@/lib/placeholder-data";


export default function TecnicosPage() {
  const technicians = placeholderTechnicians;

  return (
    <>
      <PageHeader
        title="Gestión de Técnicos"
        description="Administra los perfiles y el rendimiento de los técnicos."
        actions={
          <TechnicianDialog
            trigger={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Técnico
              </Button>
            }
          />
        }
      />
      <TechniciansTable technicians={technicians} />
    </>
  );
}
