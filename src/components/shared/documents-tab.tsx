"use client";

/**
 * Shared DocumentsTab — renders a contract generator based on entity type.
 * Used in: Vehicle profile, Driver profile, Personnel profile.
 */

import React, { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileSignature, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────────────────────

interface VehicleData {
  licensePlate?: string;
  make?: string;
  model?: string;
  year?: number | string;
  vin?: string;
  ownerName?: string;
  ownerPhone?: string;
  dailyRentalCost?: number;
}

interface PersonData {
  name?: string;
  phone?: string;
  role?: string;
  hireDate?: string;
  monthlySalary?: number;
}

export interface DocumentsTabProps {
  /** Context determines which contract types appear */
  context: "vehicle" | "driver" | "staff";
  vehicle?: VehicleData;
  person?: PersonData;
}

// ── Contract templates ────────────────────────────────────────────────────────

function DriverContract({ vehicle, driver }: { vehicle?: VehicleData; driver?: PersonData }) {
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
  return (
    <div className="space-y-6 text-sm text-black p-8 bg-white" style={{ fontFamily: "serif" }}>
      <h1 className="text-xl font-bold text-center underline mb-8">
        CONTRATO DE ARRENDAMIENTO DE VEHÍCULO PARA CONDUCTOR
      </h1>
      <p className="text-justify leading-relaxed">
        En la ciudad de Aguascalientes, Ags., a {today}, se celebra el presente Contrato de
        Arrendamiento Vehicular, por una parte <strong>RANORO</strong>, en lo sucesivo
        &ldquo;EL ARRENDADOR&rdquo;, y por la otra parte el C.{" "}
        <strong>{driver?.name ?? "________________________"}</strong>, en lo sucesivo
        &ldquo;EL CONDUCTOR&rdquo;.
      </p>
      {vehicle && (
        <p className="text-justify leading-relaxed">
          El vehículo objeto del presente contrato es: <strong>{vehicle.make} {vehicle.model}</strong>{" "}
          modelo <strong>{vehicle.year}</strong>, con placas <strong>{vehicle.licensePlate}</strong>
          {vehicle.vin ? `, NIV: ${vehicle.vin}` : ""}.
        </p>
      )}
      {vehicle?.dailyRentalCost && (
        <p>
          La renta diaria pactada es de <strong>${vehicle.dailyRentalCost.toFixed(2)} MXN</strong>.
        </p>
      )}
      <p className="text-justify leading-relaxed">
        (Pendiente de insertar cláusulas completas del contrato oficial.)
      </p>
      <div className="mt-24 flex justify-between items-end">
        <div className="text-center w-1/2 px-4 border-t border-black pt-2 mx-4">
          Firma ARRENDADOR — RANORO
        </div>
        <div className="text-center w-1/2 px-4 border-t border-black pt-2 mx-4">
          Firma CONDUCTOR — {driver?.name ?? "________________________"}
        </div>
      </div>
    </div>
  );
}

function OwnerContract({ vehicle }: { vehicle?: VehicleData }) {
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
  return (
    <div className="space-y-6 text-sm text-black p-8 bg-white" style={{ fontFamily: "serif" }}>
      <h1 className="text-xl font-bold text-center underline mb-8">
        CONTRATO DE ADMINISTRACIÓN DE FLOTILLA CON PROPIETARIO
      </h1>
      <p className="text-justify leading-relaxed">
        En la ciudad de Aguascalientes, Ags., a {today}, se celebra el presente contrato entre{" "}
        <strong>RANORO</strong> (EL ADMINISTRADOR) y el C.{" "}
        <strong>{vehicle?.ownerName ?? "________________________"}</strong> (EL PROPIETARIO)
        respecto al vehículo con placas{" "}
        <strong>{vehicle?.licensePlate ?? "____________"}</strong>
        {vehicle?.vin ? ` y NIV ${vehicle.vin}` : ""}.
      </p>
      <p className="text-justify leading-relaxed">
        (Pendiente de insertar cláusulas completas del contrato oficial.)
      </p>
      <div className="mt-24 flex justify-between items-end">
        <div className="text-center w-1/2 px-4 border-t border-black pt-2 mx-4">
          Firma ADMINISTRADOR — RANORO
        </div>
        <div className="text-center w-1/2 px-4 border-t border-black pt-2 mx-4">
          Firma PROPIETARIO — {vehicle?.ownerName ?? "________________________"}
        </div>
      </div>
    </div>
  );
}

function PersonnelContract({ person }: { person?: PersonData }) {
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
  return (
    <div className="space-y-6 text-sm text-black p-8 bg-white" style={{ fontFamily: "serif" }}>
      <h1 className="text-xl font-bold text-center underline mb-8">
        CONTRATO INDIVIDUAL DE TRABAJO
      </h1>
      <p className="text-justify leading-relaxed">
        En la ciudad de Aguascalientes, Ags., a {today}, se celebra el presente Contrato Individual
        de Trabajo por tiempo indeterminado entre <strong>RANORO</strong> (EL PATRÓN) y el C.{" "}
        <strong>{person?.name ?? "________________________"}</strong> (EL TRABAJADOR), quien
        desempeñará el cargo de <strong>{person?.role ?? "_________________"}</strong>.
      </p>
      {person?.monthlySalary && (
        <p>
          El salario mensual acordado es de <strong>${person.monthlySalary.toFixed(2)} MXN</strong>.
        </p>
      )}
      <p className="text-justify leading-relaxed">
        (Pendiente de insertar cláusulas completas del contrato oficial.)
      </p>
      <div className="mt-24 flex justify-between items-end">
        <div className="text-center w-1/2 px-4 border-t border-black pt-2 mx-4">
          Firma PATRÓN — RANORO
        </div>
        <div className="text-center w-1/2 px-4 border-t border-black pt-2 mx-4">
          Firma TRABAJADOR — {person?.name ?? "________________________"}
        </div>
      </div>
    </div>
  );
}

// ── Contract type options per context ─────────────────────────────────────────

const CONTRACT_OPTIONS: Record<DocumentsTabProps["context"], { value: string; label: string }[]> = {
  vehicle: [
    { value: "owner", label: "Contrato con Propietario del Vehículo" },
    { value: "driver", label: "Contrato de Arrendamiento para Conductor" },
  ],
  driver: [
    { value: "driver", label: "Contrato de Arrendamiento (Conductor)" },
  ],
  staff: [
    { value: "personnel", label: "Contrato Individual de Trabajo" },
  ],
};

// ── Main component ────────────────────────────────────────────────────────────

export function DocumentsTab({ context, vehicle, person }: DocumentsTabProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [contractType, setContractType] = useState("");
  const options = CONTRACT_OPTIONS[context];

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Contrato_${contractType.toUpperCase()}`,
  });

  const renderContract = () => {
    switch (contractType) {
      case "driver": return <DriverContract vehicle={vehicle} driver={person} />;
      case "owner": return <OwnerContract vehicle={vehicle} />;
      case "personnel": return <PersonnelContract person={person} />;
      default: return null;
    }
  };

  const preview = renderContract();

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="h-4 w-4" /> Generar Contrato
          </CardTitle>
          <CardDescription>
            Selecciona el tipo de contrato. Los datos se pre-llenan automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Select value={contractType} onValueChange={setContractType}>
              <SelectTrigger className="w-full sm:w-[340px] bg-white border-slate-200">
                <SelectValue placeholder="Seleccionar tipo de contrato…" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {contractType && (
              <Button
                onClick={() => handlePrint()}
                className="bg-black text-white hover:bg-black/90 gap-2"
              >
                <Printer className="h-4 w-4" /> Imprimir / Guardar PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {preview && (
        <div className="bg-zinc-200 p-4 sm:p-8 rounded-xl overflow-x-auto min-h-[600px] flex justify-center border shadow-inner">
          <Card className="min-w-[800px] max-w-[850px] shadow-2xl border-0 print:shadow-none print:max-w-none print:w-full bg-white print:m-0 print:p-0">
            <div ref={printRef} className="print:m-8 print:p-0">
              {preview}
            </div>
          </Card>
        </div>
      )}

      {!contractType && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 border-2 border-dashed rounded-xl">
          <FileText className="h-10 w-10 opacity-40" />
          <p className="font-medium">Selecciona un tipo de contrato para previsualizar</p>
        </div>
      )}
    </div>
  );
}
