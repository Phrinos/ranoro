"use client";

import React, { useState } from "react";
import { withSuspense } from "@/lib/withSuspense";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileSignature, Printer } from "lucide-react";
import dynamic from "next/dynamic";

const ContractGenerator = dynamic(
  () => import("./components/ContractGenerator").then(m => m.ContractGenerator),
  { ssr: false }
);

function ContratosPageInner() {
  const [contractType, setContractType] = useState<string>("");

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-black text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <FileSignature className="h-8 w-8" /> Generador de Contratos
          </h1>
          <p className="text-white/70 text-sm mt-1 max-w-xl">
            Selecciona un tipo de contrato para previsualizarlo e imprimirlo. Los formatos oficiales se activarán próximamente.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generar Nuevo Documento</CardTitle>
          <CardDescription>
            Elige el formato que deseas emitir. La plataforma autocompletará los datos según corresponda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="max-w-sm">
                <Select value={contractType} onValueChange={setContractType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar Tipo de Contrato..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conductor">Contrato para Conductores</SelectItem>
                    <SelectItem value="dueno">Contrato para Dueño de Vehículos</SelectItem>
                    <SelectItem value="personal">Contrato de Personal (Empleados)</SelectItem>
                  </SelectContent>
                </Select>
            </div>

            {contractType && (
                <div className="pt-4 border-t">
                    <ContractGenerator type={contractType} />
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

export default withSuspense(ContratosPageInner, null);
