"use client";
import { useState } from "react";
import { saveAs } from "file-saver";
import { generateLeaseContractPdf } from "@/lib/contracts/generate-pdf";
import type { LeaseContractInput } from "@/lib/contracts/types";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown } from "lucide-react";

export default function GenerateLeaseButton({ data }: { data: LeaseContractInput }) {
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      const blob = await generateLeaseContractPdf(data);
      const nameSafe = `${data.vehicle.plates}-${data.lessee.name}`.replace(/\s+/g, "_");
      saveAs(blob, `Contrato_Arrendamiento_${nameSafe}.pdf`);
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
