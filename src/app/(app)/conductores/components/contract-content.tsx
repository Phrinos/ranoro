
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
    const workshopAddress = "Av. de la Convencion de 1914 No. 1421, Jardines de la Concepcion, C.P. 20267, Aguascalientes, Ags.";

    return (
      <div 
        ref={ref}
        data-format="letter"
        className="font-serif bg-white text-black p-8 text-sm leading-relaxed"
      >
        <header className="text-center mb-6">
            <h1 className="text-lg font-bold uppercase tracking-wider">Contrato de Arrendamiento de Vehículo</h1>
            <p className="text-xs">CON OBLIGACIÓN SOLIDARIA Y PAGARÉ</p>
        </header>

        <section className="mb-6 text-justify text-xs">
            <p>
                CONTRATO DE ARRENDAMIENTO DE VEHÍCULO AUTOMOTOR, QUE CELEBRAN EN LA CIUDAD DE AGUASCALIENTES, AGS., A {formattedContractDate}.
                POR UNA PARTE, <strong>{vehicle.ownerName ? `C. ${vehicle.ownerName.toUpperCase()}` : 'EL PROPIETARIO REGISTRADO'}</strong>, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ
                <strong> "EL ARRENDADOR"</strong>. POR OTRA PARTE, <strong>C. {driver.name.toUpperCase()}</strong>, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ <strong>"EL ARRENDATARIO"</strong>.
                Y POR ÚLTIMO <strong>RANORO</strong>, REPRESENTADA EN ESTE ACTO, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ <strong>"EL ADMINISTRADOR"</strong>,
                AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:
            </p>
        </section>

        <h2 className="font-bold text-center mb-4 uppercase text-sm">Declaraciones</h2>

        <section className="mb-6 text-xs space-y-2 text-justify">
            <p><strong>I.- DECLARA "EL ARRENDADOR":</strong></p>
            <p>a) Ser una persona física con plena capacidad para contratar y obligarse.</p>
            <p>b) Ser el legítimo propietario del vehículo objeto de este contrato, cuyas características se detallan más adelante.</p>

            <p className="mt-2"><strong>II.- DECLARA "EL ARRENDATARIO":</strong></p>
            <p>a) Ser una persona física, con plena capacidad jurídica para celebrar el presente acto.</p>
            <p>b) Que su domicilio para todos los efectos legales de este contrato es el de "EL ADMINISTRADOR", ubicado en <strong>{workshopAddress}</strong>.</p>
            <p>c) Que cuenta con la licencia de conducir vigente y la pericia necesaria para operar el vehículo arrendado.</p>

            <p className="mt-2"><strong>III.- DECLARA "EL ADMINISTRADOR":</strong></p>
            <p>a) Ser una entidad con facultades para actuar como intermediario y administrador en el presente contrato, encargado de la gestión de cobros y mantenimientos del vehículo.</p>
        </section>
        
        <h2 className="font-bold text-center mb-4 uppercase text-sm">Cláusulas</h2>

        <section className="mb-6 text-xs space-y-3 text-justify">
            <div>
              <p>
                <strong>PRIMERA.- OBJETO.</strong> "EL ARRENDADOR" da en arrendamiento a "EL ARRENDATARIO", quien recibe a su entera satisfacción, el vehículo de las siguientes características:
              </p>
              <div className="pl-4 border-l-2 border-gray-300 ml-4 py-2 my-2 text-sm">
                  <p><strong>Marca:</strong> {vehicle.make}</p>
                  <p><strong>Modelo:</strong> {vehicle.model}</p>
                  <p><strong>Año:</strong> {vehicle.year}</p>
                  <p><strong>Placas:</strong> {vehicle.licensePlate}</p>
                  <p><strong>VIN:</strong> {vehicle.vin || 'N/A'}</p>
              </div>
            </div>

            <p>
                <strong>SEGUNDA.- RENTA Y FORMA DE PAGO.</strong> "EL ARRENDATARIO" se obliga a pagar a "EL ADMINISTRADOR" una renta diaria de <strong>{formatCurrency(vehicle.dailyRentalCost || 0)}</strong>. Los pagos se realizarán de manera diaria, sin excepción, en las instalaciones de "EL ADMINISTRADOR".
            </p>

            <p>
                <strong>TERCERA.- DEPÓSITO EN GARANTÍA.</strong> A la firma del presente contrato, "EL ARRENDATARIO" entrega a "EL ADMINISTRADOR" la cantidad de <strong>{formatCurrency(driver.depositAmount || 0)}</strong> por concepto de depósito en garantía. Este depósito no será considerado como pago de renta y servirá para garantizar el cumplimiento de las obligaciones del presente contrato, así como para cubrir posibles daños al vehículo o adeudos pendientes. Dicho depósito será devuelto íntegramente al término del contrato, siempre y cuando el vehículo sea restituido en las mismas condiciones en que fue entregado, salvo el demérito normal por su uso.
            </p>

            <p>
                <strong>CUARTA.- VIGENCIA.</strong> La vigencia del presente contrato será indefinida, iniciando el día de su firma. Cualquiera de las partes podrá darlo por terminado notificando a "EL ADMINISTRADOR" con un mínimo de 24 horas de antelación.
            </p>

            <div>
              <p><strong>QUINTA.- OBLIGACIONES DEL ARRENDATARIO.</strong></p>
              <ul className="list-decimal pl-6 mt-1 space-y-1">
                  <li>Utilizar el vehículo de manera prudente, de acuerdo a su naturaleza y exclusivamente para el fin convenido.</li>
                  <li>Cubrir la totalidad de los gastos de combustible y demás consumibles necesarios para la operación del vehículo.</li>
                  <li>Reportar de manera inmediata a "EL ADMINISTRADOR" cualquier falla mecánica, siniestro, robo o daño que sufra el vehículo.</li>
                  <li>No realizar ni permitir que se realicen reparaciones o modificaciones de ningún tipo al vehículo sin la autorización previa y por escrito de "EL ADMINISTRADOR".</li>
                  <li>Asumir la total responsabilidad por infracciones de tránsito, así como de los daños y perjuicios que cause a terceros en sus bienes o personas con motivo del uso del vehículo.</li>
                  <li>Restituir el vehículo al término del contrato en las oficinas de "EL ADMINISTRADOR".</li>
              </ul>
            </div>

            <div>
              <p><strong>SEXTA.- OBLIGACIONES DE "EL ADMINISTRADOR".</strong></p>
              <ul className="list-decimal pl-6 mt-1 space-y-1">
                  <li>Coordinar y cubrir los costos de los mantenimientos preventivos y correctivos necesarios para el buen funcionamiento del vehículo, siempre que no se deban a negligencia o mal uso por parte de "EL ARRENDATARIO".</li>
                  <li>Gestionar la recepción de los pagos de renta y la administración general del presente contrato.</li>
              </ul>
            </div>
            
            <p>
                <strong>SÉPTIMA.- PAGARÉ.</strong> "EL ARRENDATARIO" suscribe un pagaré mercantil en favor de "EL ARRENDADOR" por la cantidad de ${'50,000.00'} (CINCUENTA MIL PESOS 00/100 M.N.) para garantizar el cumplimiento de todas y cada una de las obligaciones estipuladas en este contrato, el cual será devuelto a la terminación del mismo, siempre que no exista adeudo alguno.
            </p>
            
            <p>
                <strong>OCTAVA.- JURISDICCIÓN.</strong> Para la interpretación y cumplimiento del presente contrato, las partes se someten expresamente a la jurisdicción y competencia de los tribunales de la ciudad de Aguascalientes, Ags., renunciando a cualquier otro fuero que por razón de sus domicilios presentes o futuros pudiera corresponderles.
            </p>
        </section>

        <p className="text-xs text-center mb-10">
            Leído el presente contrato y enteradas las partes de su contenido y alcance legal, lo firman por duplicado de común acuerdo.
        </p>

        <footer className="mt-20 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t-2 border-black pt-2">
                <p className="font-semibold">{vehicle.ownerName?.toUpperCase()}</p>
                <p>("EL ARRENDADOR")</p>
            </div>
            <div className="border-t-2 border-black pt-2">
                <p className="font-semibold">{driver.name.toUpperCase()}</p>
                <p>("EL ARRENDATARIO")</p>
            </div>
        </footer>
      </div>
    );
  }
);
ContractContent.displayName = "ContractContent";
