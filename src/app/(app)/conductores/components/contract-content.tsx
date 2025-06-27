
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
        <p className="text-center font-bold mb-4">
          CONTRATO DE ARRENDAMIENTO DE VEHÍCULO AUTOMOTOR, QUE CELEBRAN POR UNA PARTE, EL C. {vehicle.ownerName ? vehicle.ownerName.toUpperCase() : '[PROPIETARIO]'}, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL ARRENDADOR", Y POR LA OTRA PARTE, EL C. {driver.name.toUpperCase()}, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL ARRENDATARIO", AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:
        </p>

        <h2 className="font-bold text-center mb-2">DECLARACIONES</h2>
        
        <p className="mb-2"><strong>I.- Declara "EL ARRENDADOR":</strong></p>
        <ul className="list-disc pl-8 mb-4">
            <li>Ser una persona física de nacionalidad mexicana, mayor de edad, con plena capacidad para celebrar el presente contrato.</li>
            <li>Ser el legítimo propietario del vehículo materia de este contrato, cuyas características se describen a continuación:
                <ul className="list-disc pl-8 mt-2">
                    <li>Marca: {vehicle.make}</li>
                    <li>Modelo: {vehicle.model}</li>
                    <li>Año: {vehicle.year}</li>
                    <li>Placas: {vehicle.licensePlate}</li>
                    <li>Número de Identificación Vehicular (VIN): {vehicle.vin || 'NO ESPECIFICADO'}</li>
                </ul>
            </li>
            <li>Que el vehículo se encuentra en óptimas condiciones mecánicas y de funcionamiento para el uso convenido, libre de todo gravamen y al corriente en el pago de sus contribuciones fiscales.</li>
        </ul>

        <p className="mb-2"><strong>II.- Declara "EL ARRENDATARIO":</strong></p>
        <ul className="list-disc pl-8 mb-4">
            <li>Ser una persona física de nacionalidad mexicana, mayor de edad, con plena capacidad para contratar y obligarse en los términos del presente instrumento, y que su domicilio para todos los efectos legales es el ubicado en: {driver.address}.</li>
            <li>Que posee la pericia, los conocimientos técnicos necesarios y la licencia de conducir vigente y expedida por la autoridad competente para la operación del vehículo objeto de este contrato.</li>
            <li>Que ha inspeccionado el vehículo a su entera satisfacción, recibiéndolo en las condiciones descritas por "EL ARRENDADOR".</li>
        </ul>

        <p className="mb-2"><strong>III.- Declaran ambas partes:</strong></p>
        <p className="mb-4">Que es su libre voluntad celebrar el presente contrato de arrendamiento, sujetándose a las siguientes:</p>
        
        <h2 className="font-bold text-center mb-2">CLÁUSULAS</h2>

        <div className="space-y-3 text-justify">
            <p><strong>PRIMERA.- OBJETO.</strong> "EL ARRENDADOR" otorga en arrendamiento a "EL ARRENDATARIO" el vehículo descrito en la declaración I, inciso b) del presente contrato.</p>
            <p><strong>SEGUNDA.- RENTA.</strong> "EL ARRENDATARIO" se obliga a pagar a "EL ARRENDADOR" una renta diaria por la cantidad de {formatCurrency(vehicle.dailyRentalCost || 0)}. El pago deberá realizarse de manera diaria y por adelantado. La falta de pago oportuno de una sola renta será causa de rescisión inmediata del contrato.</p>
            <p><strong>TERCERA.- VIGENCIA.</strong> El presente contrato tendrá una vigencia indefinida, iniciando su validez el día {formattedContractDate}. Cualquiera de las partes podrá darlo por terminado mediante notificación por escrito a la otra con al menos 24 horas de antelación.</p>
            <p><strong>CUARTA.- USO DEL VEHÍCULO.</strong> "EL ARRENDATARIO" se obliga a destinar el vehículo exclusivamente para su uso como transporte particular y/o para el servicio de transporte de pasajeros mediante plataformas digitales. Le queda estrictamente prohibido subarrendarlo, utilizarlo para fines ilícitos, participar en carreras o pruebas de velocidad, o para remolcar otros vehículos.</p>
            <p><strong>QUINTA.- MANTENIMIENTO Y REPARACIONES.</strong> Los costos de mantenimiento preventivo y correctivo derivados del uso normal del vehículo serán cubiertos por "EL ARRENDADOR" a través de su administrador "RANORO". "EL ARRENDATARIO" se compromete a notificar de inmediato cualquier falla o desperfecto que presente el vehículo. Los daños causados por negligencia, mal uso o accidente imputable a "EL ARRENDATARIO" serán de su exclusiva responsabilidad.</p>
            <p><strong>SEXTA.- DEPÓSITO EN GARANTÍA.</strong> A la firma del presente contrato, "EL ARRENDATARIO" entrega a "EL ARRENDADOR" la cantidad de {formatCurrency(driver.depositAmount || 0)} como depósito en garantía. Este monto será reintegrado al finalizar el contrato, siempre y cuando el vehículo sea devuelto en las mismas condiciones en que fue recibido, salvo el desgaste normal por el uso, y no existan adeudos por rentas, multas o daños.</p>
            <p><strong>SÉPTIMA.- PAGARÉ.</strong> Para garantizar el cumplimiento de todas y cada una de las obligaciones estipuladas en este contrato, "EL ARRENDATARIO" suscribe en este acto un pagaré mercantil a favor de "EL ARRENDADOR" por la cantidad de $50,000.00 (CINCUENTA MIL PESOS 00/100 M.N.). Dicho pagaré será exigible en caso de incumplimiento y devuelto a la terminación satisfactoria del contrato.</p>
            <p><strong>OCTAVA.- RESPONSABILIDAD CIVIL Y PENAL.</strong> "EL ARRENDATARIO" será el único responsable por los daños y perjuicios que se causen a terceros en sus bienes o personas con motivo del uso del vehículo. Asimismo, será responsable de todas las infracciones de tránsito y sanciones administrativas que se impongan durante la vigencia del contrato.</p>
            <p><strong>NOVENA.- JURISDICCIÓN.</strong> Para la interpretación y cumplimiento del presente contrato, las partes se someten expresamente a la jurisdicción de los tribunales competentes de la ciudad de Aguascalientes, Aguascalientes, renunciando a cualquier otro fuero que por razón de sus domicilios presentes o futuros pudiera corresponderles.</p>
        </div>

        <p className="text-xs text-center my-10">
            Leído que fue el presente contrato por ambas partes y enteradas de su contenido y alcance legal, lo firman de conformidad en la ciudad de Aguascalientes, Ags., el día {formattedContractDate}.
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
