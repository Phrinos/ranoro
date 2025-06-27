
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
        <p className="text-center font-bold mb-6 text-lg uppercase">Contrato de Arrendamiento de Vehículo Automotor</p>

        <p className="mb-4 text-justify">
            CONTRATO DE ARRENDAMIENTO DE VEHÍCULO AUTOMOTOR QUE CELEBRAN POR UNA PARTE, EL C. <strong>{vehicle.ownerName ? vehicle.ownerName.toUpperCase() : '[PROPIETARIO DEL VEHÍCULO]'}</strong>, A QUIEN EN LO SUCESIVO Y PARA LOS EFECTOS DEL PRESENTE CONTRATO SE LE DENOMINARÁ <strong>"EL ARRENDADOR"</strong>, Y POR LA OTRA PARTE, EL C. <strong>{driver.name.toUpperCase()}</strong>, A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ <strong>"EL ARRENDATARIO"</strong>, AMBAS PARTES CON CAPACIDAD LEGAL PARA CONTRATAR Y OBLIGARSE, AL TENOR DE LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:
        </p>

        <h2 className="font-bold text-center mb-2 uppercase">Declaraciones</h2>
        
        <p className="mb-2"><strong>I. Declara "EL ARRENDADOR":</strong></p>
        <ol className="list-decimal list-inside pl-4 mb-4 space-y-1 text-justify">
            <li>Ser una persona física, mayor de edad, de nacionalidad mexicana, con plena capacidad jurídica para celebrar el presente contrato y obligarse en sus términos.</li>
            <li>Ser el legítimo propietario del vehículo automotor que se describe a continuación (en adelante "EL VEHÍCULO"):
                <ul className="list-disc pl-8 mt-2">
                    <li><strong>Marca:</strong> {vehicle.make}</li>
                    <li><strong>Modelo:</strong> {vehicle.model}</li>
                    <li><strong>Año:</strong> {vehicle.year}</li>
                    <li><strong>Placas de Circulación:</strong> {vehicle.licensePlate}</li>
                    <li><strong>Número de Identificación Vehicular (VIN):</strong> {vehicle.vin || 'NO ESPECIFICADO'}</li>
                    <li><strong>Color:</strong> {vehicle.color || 'NO ESPECIFICADO'}</li>
                </ul>
            </li>
            <li>Que "EL VEHÍCULO" se encuentra en óptimas condiciones mecánicas, de seguridad y de funcionamiento para el uso al que está destinado, libre de todo gravamen, limitación de dominio y al corriente en el pago de sus contribuciones fiscales y derechos vehiculares a la fecha de celebración de este contrato.</li>
        </ol>

        <p className="mb-2"><strong>II. Declara "EL ARRENDATARIO":</strong></p>
        <ol className="list-decimal list-inside pl-4 mb-4 space-y-1 text-justify">
            <li>Ser una persona física, mayor de edad, de nacionalidad mexicana, con plena capacidad para contratar y obligarse, y que su domicilio para todos los efectos legales del presente instrumento es el ubicado en: <strong>{driver.address}</strong>.</li>
            <li>Que posee la pericia, los conocimientos técnicos necesarios y la licencia de conducir vigente y expedida por la autoridad competente, para la operación y manejo de "EL VEHÍCULO".</li>
            <li>Que ha inspeccionado física y mecánicamente "EL VEHÍCULO" a su entera satisfacción, recibiéndolo en las condiciones descritas por "EL ARRENDADOR", y manifiesta su conformidad con el estado general del mismo.</li>
        </ol>

        <p className="mb-4 text-justify">
            Expuesto lo anterior, las partes manifiestan su conformidad y se otorgan su consentimiento para celebrar el presente contrato, sujetándose a las siguientes:
        </p>
        
        <h2 className="font-bold text-center mb-2 uppercase">Cláusulas</h2>

        <div className="space-y-3 text-justify">
            <p><strong>PRIMERA.- OBJETO.</strong> "EL ARRENDADOR" otorga en arrendamiento puro a "EL ARRENDATARIO" el uso y goce temporal de "EL VEHÍCULO" descrito en la Declaración I, inciso 2, del presente contrato.</p>
            
            <p><strong>SEGUNDA.- RENTA.</strong> Las partes convienen que "EL ARRENDATARIO" pagará a "EL ARRENDADOR" como contraprestación por el uso de "EL VEHÍCULO", una renta diaria por la cantidad de <strong>{formatCurrency(vehicle.dailyRentalCost || 0)}</strong>. El pago deberá realizarse de manera diaria, por adelantado, en el domicilio de "EL ARRENDADOR" o mediante los medios que este designe. La falta de pago oportuno de una sola de las rentas estipuladas será causa de rescisión inmediata del contrato, sin necesidad de declaración judicial.</p>
            
            <p><strong>TERCERA.- VIGENCIA.</strong> El presente contrato tendrá una vigencia indefinida, iniciando su validez el día <strong>{formattedContractDate}</strong>. Cualquiera de las partes podrá darlo por terminado en cualquier momento, mediante notificación por escrito a la otra con al menos veinticuatro (24) horas de antelación, debiendo "EL ARRENDATARIO" devolver "EL VEHÍCULO" y liquidar cualquier adeudo pendiente.</p>
            
            <p><strong>CUARTA.- USO DEL VEHÍCULO.</strong> "EL ARRENDATARIO" se obliga a destinar "EL VEHÍCULO" exclusivamente para su uso como transporte particular y/o para la prestación del servicio de transporte de pasajeros mediante plataformas tecnológicas autorizadas. Le queda estrictamente prohibido subarrendarlo, ceder sus derechos, utilizarlo para fines ilícitos, participar en carreras, arrancones o pruebas de velocidad, o para remolcar otros vehículos, salvo que esté diseñado para ello.</p>
            
            <p><strong>QUINTA.- MANTENIMIENTO Y REPARACIONES.</strong> Los costos de mantenimiento preventivo y las reparaciones derivadas del desgaste normal y uso adecuado de "EL VEHÍCULO" serán cubiertos por "EL ARRENDADOR". "EL ARRENDATARIO" se compromete a notificar de inmediato a "EL ARRENDADOR" o a su administrador designado, cualquier falla, desperfecto o testigo de advertencia que presente "EL VEHÍCULO". Los daños causados por negligencia, mal uso, abuso o accidente imputable a "EL ARRENDATARIO" serán de su exclusiva responsabilidad, debiendo cubrir el costo total de las reparaciones.</p>
            
            <p><strong>SEXTA.- DEPÓSITO EN GARANTÍA.</strong> A la firma del presente contrato, "EL ARRENDATARIO" entrega a "EL ARRENDADOR" la cantidad de <strong>{formatCurrency(driver.depositAmount || 0)}</strong>, mediante [MÉTODO DE PAGO DEL DEPÓSITO], como depósito en garantía para asegurar el cumplimiento de sus obligaciones. Este monto será reintegrado al finalizar la relación contractual, una vez que "EL ARRENDATARIO" haya devuelto "EL VEHÍCULO" en las mismas condiciones en que fue recibido, salvo el desgaste normal, y no existan adeudos por rentas, multas, deducibles o daños.</p>
            
            <p><strong>SÉPTIMA.- PAGARÉ.</strong> De forma independiente al depósito en garantía, y para garantizar el cumplimiento de todas y cada una de las obligaciones estipuladas en este contrato, incluyendo el pago de rentas, daños al vehículo, multas o cualquier otro cargo aplicable, "EL ARRENDATARIO" suscribe en este acto un pagaré mercantil a favor de "EL ARRENDADOR" por la cantidad de <strong>$50,000.00 (CINCUENTA MIL PESOS 00/100 M.N.)</strong>. Dicho pagaré será exigible únicamente en caso de incumplimiento de "EL ARRENDATARIO" y será devuelto a la terminación satisfactoria del presente contrato.</p>
            
            <p><strong>OCTAVA.- RESPONSABILIDAD.</strong> "EL ARRENDATARIO" será el único y exclusivo responsable por los daños y perjuicios que se causen a terceros en sus bienes o personas con motivo del uso de "EL VEHÍCULO". Asimismo, será responsable de todas las infracciones a los reglamentos de tránsito y sanciones administrativas que se impongan durante la vigencia del contrato, obligándose a reembolsar a "EL ARRENDADOR" cualquier cantidad que este tuviere que pagar por dichos conceptos.</p>
            
            <p><strong>NOVENA.- JURISDICCIÓN Y COMPETENCIA.</strong> Para todo lo relativo a la interpretación, cumplimiento y ejecución del presente contrato, las partes se someten expresamente a la jurisdicción y competencia de los tribunales competentes de la ciudad de Aguascalientes, Aguascalientes, renunciando expresamente a cualquier otro fuero que por razón de sus domicilios presentes o futuros pudiera corresponderles.</p>
        </div>

        <p className="text-xs text-center my-10">
            Leído que fue el presente contrato por ambas partes, y enteradas de su contenido y alcance legal, lo firman de entera conformidad en la ciudad de Aguascalientes, Aguascalientes, en la fecha de su celebración.
        </p>

        <footer className="mt-20 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t-2 border-black pt-2">
                <p className="font-semibold">{vehicle.ownerName?.toUpperCase()}</p>
                <p><strong>"EL ARRENDADOR"</strong></p>
            </div>
            <div className="border-t-2 border-black pt-2">
                <p className="font-semibold">{driver.name.toUpperCase()}</p>
                <p><strong>"EL ARRENDATARIO"</strong></p>
            </div>
        </footer>
      </div>
    );
  }
);
ContractContent.displayName = "ContractContent";
