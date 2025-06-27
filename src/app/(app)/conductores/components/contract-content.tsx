
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
            <h1 className="text-lg font-bold uppercase tracking-wider">Contrato de Arrendamiento de Vehículo Automotor</h1>
            <p className="text-xs">Que celebran, por una parte, el C. {vehicle.ownerName ? vehicle.ownerName.toUpperCase() : '[PROPIETARIO]'}, en su carácter de "ARRENDADOR", y por la otra, el C. {driver.name.toUpperCase()}, en su carácter de "ARRENDATARIO", con la intervención de "RANORO" como "ADMINISTRADOR", al tenor de las siguientes Declaraciones y Cláusulas.</p>
        </header>

        <h2 className="font-bold text-center mb-4 uppercase text-sm">DECLARACIONES</h2>

        <section className="mb-6 text-xs space-y-2 text-justify">
            <p><strong>I.- DECLARA "EL ARRENDADOR":</strong></p>
            <p>a) Ser persona física de nacionalidad mexicana, mayor de edad, con plena capacidad jurídica para celebrar el presente acto.</p>
            <p>b) Ser el único y legítimo propietario del vehículo automotor objeto del presente contrato, y que el mismo se encuentra libre de todo gravamen y al corriente en el pago de sus contribuciones.</p>

            <p className="mt-2"><strong>II.- DECLARA "EL ARRENDATARIO":</strong></p>
            <p>a) Ser persona física, de nacionalidad mexicana, mayor de edad, con plena capacidad para contratar y obligarse en los términos del presente instrumento.</p>
            <p>b) Que tiene la pericia y los conocimientos técnicos necesarios para la operación y conducción del tipo de vehículo materia de este contrato, así como licencia para conducir vigente expedida por la autoridad competente.</p>
            <p>c) Que para todos los efectos legales del presente contrato, señala como su domicilio el ubicado en: <strong>{driver.address}</strong>.</p>
            
            <p className="mt-2"><strong>III.- DECLARAN LAS PARTES:</strong></p>
            <p>a) Que es su voluntad celebrar el presente contrato de arrendamiento, en los términos y condiciones que se establecen en las siguientes:</p>
        </section>
        
        <h2 className="font-bold text-center mb-4 uppercase text-sm">CLÁUSULAS</h2>

        <section className="mb-6 text-xs space-y-3 text-justify">
            <p>
                <strong>PRIMERA.- OBJETO.</strong> "EL ARRENDADOR" otorga en arrendamiento a "EL ARRENDATARIO" el vehículo automotor con las siguientes características:
            </p>
            <div className="pl-4 border-l-2 border-gray-300 ml-4 py-2 my-2 text-sm">
                <p><strong>Marca:</strong> {vehicle.make}</p>
                <p><strong>Modelo:</strong> {vehicle.model}</p>
                <p><strong>Año:</strong> {vehicle.year}</p>
                <p><strong>Placas:</strong> {vehicle.licensePlate}</p>
                <p><strong>VIN (NIV):</strong> {vehicle.vin || 'NO ESPECIFICADO'}</p>
            </div>
            <p>"EL ARRENDATARIO" recibe el vehículo en perfectas condiciones de funcionamiento, con todo el equipo completo y en estado de servir para el uso convenido.</p>

            <p>
                <strong>SEGUNDA.- RENTA.</strong> "EL ARRENDATARIO" se obliga a pagar por concepto de renta la cantidad diaria de <strong>{formatCurrency(vehicle.dailyRentalCost || 0)}</strong>. Dicha cantidad será liquidada diariamente y por adelantado en el domicilio de "EL ADMINISTRADOR". La falta de pago de una sola de las rentas estipuladas será causa suficiente para que "EL ARRENDADOR" rescinda el presente contrato y solicite la devolución inmediata del vehículo.
            </p>

            <p>
                <strong>TERCERA.- VIGENCIA.</strong> El presente contrato tendrá una vigencia indefinida, iniciando el día <strong>{formattedContractDate}</strong>. Cualquiera de las partes podrá darlo por terminado mediante aviso por escrito a la otra parte con al menos 24 horas de anticipación.
            </p>
            
            <p>
                <strong>CUARTA.- USO DEL VEHÍCULO.</strong> "EL ARRENDATARIO" se obliga a utilizar el vehículo arrendado exclusivamente como medio de transporte particular y/o para el servicio de transporte de pasajeros mediante plataformas digitales. Le queda estrictamente prohibido subarrendarlo, destinarlo a fines ilícitos, utilizarlo en carreras o pruebas de velocidad, o para remolcar otros vehículos.
            </p>

            <p>
                <strong>QUINTA.- MANTENIMIENTO.</strong> "EL ADMINISTRADOR" será responsable de realizar los servicios de mantenimiento preventivo y correctivo que sean necesarios para el buen funcionamiento del vehículo, siempre y cuando el deterioro no sea consecuencia de negligencia o mal uso por parte de "EL ARRENDATARIO". "EL ARRENDATARIO" se obliga a reportar cualquier falla de manera inmediata.
            </p>

            <p>
                <strong>SEXTA.- DEPÓSITO EN GARANTÍA.</strong> A la firma del presente contrato, "EL ARRENDATARIO" entrega a "EL ADMINISTRADOR" la cantidad de <strong>{formatCurrency(driver.depositAmount || 0)}</strong> en calidad de depósito en garantía, para asegurar el cumplimiento de sus obligaciones. Dicha cantidad será devuelta al término del contrato, una vez que el vehículo sea entregado en las mismas condiciones en que se recibió, descontando los posibles adeudos por rentas, daños, multas o cualquier otro concepto imputable al "ARRENDATARIO".
            </p>
            
            <p>
                <strong>SÉPTIMA.- PAGARÉ.</strong> Para garantizar el cumplimiento de las obligaciones derivadas de este contrato, "EL ARRENDATARIO" suscribe en este acto un pagaré mercantil en favor de "EL ARRENDADOR" por la cantidad de <strong>${'50,000.00'} (CINCUENTA MIL PESOS 00/100 M.N.)</strong>, el cual será exigible en caso de incumplimiento y devuelto a la terminación satisfactoria del contrato.
            </p>
            
            <p>
                <strong>OCTAVA.- SINIESTROS Y MULTAS.</strong> "EL ARRENDATARIO" será el único responsable de los daños y perjuicios causados a terceros, así como de todas las multas y sanciones administrativas que se generen durante el tiempo que tenga la posesión del vehículo. En caso de siniestro, deberá notificarlo de inmediato al "ADMINISTRADOR".
            </p>

            <p>
                <strong>NOVENA.- JURISDICCIÓN.</strong> Para todo lo relativo a la interpretación, cumplimiento y ejecución del presente contrato, las partes se someten expresamente a la jurisdicción y competencia de los tribunales de la ciudad de Aguascalientes, Aguascalientes, renunciando a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.
            </p>
        </section>

        <p className="text-xs text-center mb-10">
            Enteradas las partes del contenido y alcance legal del presente contrato, lo firman de conformidad en la ciudad de Aguascalientes, Ags., en la fecha de su celebración.
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
