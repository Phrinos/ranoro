"use client";
import { useState } from "react";
import { saveAs } from "file-saver";
import type { LeaseContractInput } from "@/lib/contracts/types";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown } from "lucide-react";

export default function GenerateLeaseButton({ data }: { data: LeaseContractInput }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/contracts/lease", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const nameSafe = `${data.vehicle.plates}-${data.lessee.name}`.replace(/\s+/g, "_");
      saveAs(blob, `Contrato_Arrendamiento_${nameSafe}.pdf`);
    } catch (e) {
      console.error(e);
      alert("No se pudo generar el contrato. Revisa la consola para detalles.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handle} disabled={loading} type="button">
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
      {loading ? "Generando..." : "Generar contrato (PDF)"}
    </Button>
  );
}
