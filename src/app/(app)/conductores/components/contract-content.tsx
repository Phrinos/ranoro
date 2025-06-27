
"use client";

import React from 'react';
import type { Driver, Vehicle } from '@/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

interface ContractContentProps {
  driver: Driver;
  vehicle: Vehicle;
}

export const ContractContent = React.forwardRef<HTMLDivElement, ContractContentProps>(
  ({ driver, vehicle }, ref) => {
    
    const contractDate = driver.contractDate ? parseISO(driver.contractDate) : new Date();
    const formattedContractDate = format(contractDate, "dd 'de' MMMM 'de' yyyy", { locale: es });

    return (
      <div 
        ref={ref}
        data-format="letter"
        className="font-serif bg-white text-black p-8 text-sm leading-relaxed"
      >
        <header className="text-center mb-8">
          <h1 className="text-xl font-bold uppercase">Contrato de Arrendamiento de Vehículo Automotor</h1>
        </header>

        <p className="mb-4">
          En la ciudad de Aguascalientes, Ags., a {formattedContractDate}, se celebra el presente Contrato de Arrendamiento de Vehículo Automotor, que suscriben por una parte:
        </p>

        <div className="space-y-4 mb-6">
          <p>
            <strong>EL ARRENDADOR:</strong> C. {vehicle.ownerName}, con domicilio en {vehicle.ownerName ? '________________________' : 'N/A'} y teléfono {vehicle.ownerPhone}, propietario del vehículo objeto de este contrato.
          </p>
          <p>
            <strong>EL ARRENDATARIO:</strong> C. {driver.name}, con domicilio en {driver.address} y teléfono {driver.phone}, quien se identifica con ________________________.
          </p>
           <p>
            <strong>EL ADMINISTRADOR:</strong> RANORO, con domicilio en Av. de la Convencion de 1914 No. 1421, Jardines de la Concepcion, C.P. 20267, Aguascalientes, Ags., quien actúa como intermediario y administrador de los pagos y mantenimiento del vehículo.
          </p>
        </div>

        <h2 className="font-bold text-center mb-4">CLÁUSULAS</h2>
        
        <div className="mb-4">
          <p>
            <strong>PRIMERA.- OBJETO.</strong> EL ARRENDADOR otorga en arrendamiento a EL ARRENDATARIO, el vehículo de las siguientes características:
          </p>
          <ul className="list-disc pl-8 mt-2">
            <li><strong>Marca:</strong> {vehicle.make}</li>
            <li><strong>Modelo:</strong> {vehicle.model}</li>
            <li><strong>Año:</strong> {vehicle.year}</li>
            <li><strong>Placas:</strong> {vehicle.licensePlate}</li>
            <li><strong>VIN:</strong> {vehicle.vin || 'N/A'}</li>
          </ul>
        </div>

        <p className="mb-4">
          <strong>SEGUNDA.- PRECIO Y FORMA DE PAGO.</strong> EL ARRENDATARIO se obliga a pagar a EL ADMINISTRADOR una renta diaria de <strong>{formatCurrency(vehicle.dailyRentalCost || 0)}</strong>. Los pagos se realizarán diariamente en las instalaciones de EL ADMINISTRADOR.
        </p>
        
        <p className="mb-4">
          <strong>TERCERA.- DEPÓSITO EN GARANTÍA.</strong> A la firma del presente contrato, EL ARRENDATARIO entrega a EL ADMINISTRADOR la cantidad de <strong>{formatCurrency(driver.depositAmount || 0)}</strong> por concepto de depósito en garantía, para cubrir posibles daños al vehículo o adeudos. Dicho depósito será devuelto al término del contrato, una vez verificado el buen estado del vehículo.
        </p>

        <p className="mb-4">
          <strong>CUARTA.- VIGENCIA.</strong> El presente contrato tendrá una vigencia indefinida, iniciando el día de su firma. Cualquiera de las partes podrá darlo por terminado con un aviso previo de 24 horas.
        </p>

        <div className="mb-4">
          <p><strong>QUINTA.- OBLIGACIONES DEL ARRENDATARIO.</strong></p>
          <ul className="list-disc pl-8 mt-2 text-xs">
            <li>Utilizar el vehículo de manera prudente y exclusivamente para el fin convenido.</li>
            <li>Cubrir todos los gastos de combustible.</li>
            <li>Reportar de inmediato a EL ADMINISTRADOR cualquier falla, siniestro o daño que sufra el vehículo.</li>
            <li>No realizar reparaciones o modificaciones al vehículo sin autorización expresa de EL ADMINISTRADOR.</li>
            <li>Ser el único responsable por infracciones de tránsito y los daños y perjuicios que cause a terceros.</li>
          </ul>
        </div>
        
        <div className="mb-4">
           <p><strong>SEXTA.- OBLIGACIONES DE EL ADMINISTRADOR.</strong></p>
           <ul className="list-disc pl-8 mt-2 text-xs">
            <li>Realizar los mantenimientos preventivos y correctivos necesarios para el buen funcionamiento del vehículo.</li>
            <li>Gestionar los pagos de renta y la relación administrativa entre las partes.</li>
          </ul>
        </div>

        <p className="mb-4">
          Leído que fue el presente contrato y enteradas las partes de su contenido y alcance legal, lo firman de conformidad.
        </p>

        <footer className="mt-24 grid grid-cols-2 gap-8 text-center">
            <div className="border-t-2 border-black pt-2">
                <p className="font-semibold">{vehicle.ownerName}</p>
                <p className="text-xs">(EL ARRENDADOR)</p>
            </div>
            <div className="border-t-2 border-black pt-2">
                <p className="font-semibold">{driver.name}</p>
                <p className="text-xs">(EL ARRENDATARIO)</p>
            </div>
        </footer>
      </div>
    );
  }
);
ContractContent.displayName = "ContractContent";
