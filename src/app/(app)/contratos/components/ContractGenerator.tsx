"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ContractGeneratorProps {
  type: string;
}

export function ContractGenerator({ type }: ContractGeneratorProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Contrato_${type.toUpperCase()}`,
  });

  const renderContent = () => {
    switch (type) {
      case "conductor":
        return (
          <div className="space-y-6 text-sm text-black p-8 bg-white" style={{ fontFamily: "serif" }}>
            <h1 className="text-xl font-bold text-center underline mb-8">CONTRATO DE ARRENDAMIENTO DE VEHÍCULO PARA CONDUCTOR</h1>
            <p>
              (Pendiente de Cargar Machote Oficial)
            </p>
            <p className="text-justify leading-relaxed">
              En la ciudad de _______________, a los ____ días del mes de ___________ del año _______,
              se celebra el presente Contrato de Arrendamiento Vehicular, por una parte RANORO, en lo sucesivo 
              "EL ARRENDADOR", y por la otra parte el C. ________________________, en lo sucesivo "EL CONDUCTOR".
            </p>
            <div className="mt-24 flex justify-between items-end">
              <div className="text-center w-1/2 px-4 border-t border-black pt-2 mx-4">
                Firma ARRENDADOR
              </div>
              <div className="text-center w-1/2 px-4 border-t border-black pt-2 mx-4">
                Firma CONDUCTOR
              </div>
            </div>
          </div>
        );
      case "dueno":
         return (
          <div className="space-y-6 text-sm text-black p-8 bg-white" style={{ fontFamily: "serif" }}>
            <h1 className="text-xl font-bold text-center underline mb-8">CONTRATO DE ADMINISTRACIÓN DE FLOTILLA CON DUEÑO</h1>
            <p>
              (Pendiente de Cargar Machote Oficial)
            </p>
            <p className="text-justify leading-relaxed">
              En la ciudad de _______________, a los ____ días del mes de ___________ del año _______,
              se celebra el presente contrato entre RANORO (EL ADMINISTRADOR) y el C. ________________________ 
              (EL PROPIETARIO) respecto al vehículo con placas ____________ y NIV ______________________.
            </p>
            <div className="mt-24 flex justify-between items-end">
              <div className="text-center w-1/2 px-4 border-t border-black pt-2 mx-4">
                Firma ADMINISTRADOR
              </div>
              <div className="text-center w-1/2 px-4 border-t border-black pt-2 mx-4">
                Firma DUEÑO DEL VEHÍCULO
              </div>
            </div>
          </div>
        );
      case "personal":
          return (
          <div className="space-y-6 text-sm text-black p-8 bg-white" style={{ fontFamily: "serif" }}>
            <h1 className="text-xl font-bold text-center underline mb-8">CONTRATO INDIVIDUAL DE TRABAJO (PERSONAL)</h1>
            <p>
              (Pendiente de Cargar Machote Oficial)
            </p>
            <p className="text-justify leading-relaxed">
              En la ciudad de _______________, a los ____ días del mes de ___________ del año _______,
              se celebra el presente contrato INDIVIDUAL DE TRABAJO por tiempo indeterminado entre 
              RANORO (EL PATRÓN) y el C. ________________________ (EL TRABAJADOR), quien desempeñará 
              el cargo de _________________.
            </p>
            <div className="mt-24 flex justify-between items-end">
              <div className="text-center w-1/2 px-4 border-t border-black pt-2 mx-4">
                Firma PATRÓN
              </div>
              <div className="text-center w-1/2 px-4 border-t border-black pt-2 mx-4">
                Firma TRABAJADOR
              </div>
            </div>
          </div>
        );
      default:
        return <div>Seleccione un contrato válido.</div>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
         <Button onClick={() => handlePrint()} className="bg-black text-white hover:bg-black/90">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir o Guardar PDF
         </Button>
      </div>

      <div className="bg-zinc-200 p-4 sm:p-8 rounded-lg overflow-x-auto min-h-[600px] flex justify-center border shadow-inner">
         <Card className="min-w-[800px] max-w-[850px] shadow-2xl border-0 print:shadow-none print:max-w-none print:w-full bg-white print:m-0 print:p-0">
             <div ref={printRef} className="print:m-8 print:p-8">
                {renderContent()}
             </div>
         </Card>
      </div>
    </div>
  );
}
