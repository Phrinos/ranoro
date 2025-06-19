
"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { TechniciansTable } from "./components/technicians-table";
import { TechnicianDialog } from "./components/technician-dialog";
import { placeholderTechnicians } from "@/lib/placeholder-data";
import type { Technician } from "@/types";
import { useState } from "react";
import type { TechnicianFormValues } from "./components/technician-form";


export default function TecnicosPage() {
  const [technicians, setTechnicians] = useState<Technician[]>(placeholderTechnicians);

  const handleSaveTechnician = async (data: TechnicianFormValues) => {
    const newTechnician: Technician = {
      id: `T${String(technicians.length + 1).padStart(3, '0')}`, // Simple ID generation
      ...data,
      hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
      monthlySalary: Number(data.monthlySalary)
    };
    setTechnicians(prev => [...prev, newTechnician]);
    // In a real app, this would be an API call
  };


  return (
    <>
      <PageHeader
        title="Técnicos" // Changed title
        description="Administra los perfiles y el rendimiento de los técnicos."
        actions={
          <TechnicianDialog
            trigger={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nuevo Técnico
              </Button>
            }
            onSave={handleSaveTechnician}
          />
        }
      />
      <TechniciansTable technicians={technicians} />
    </>
  );
}
