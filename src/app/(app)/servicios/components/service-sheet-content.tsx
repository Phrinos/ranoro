
"use client";

import type { ServiceRecord, Vehicle } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';

const initialWorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  addressLine2: "Jardines de la Concepcion, C.P. 20267",
  cityState: "Aguascalientes, Ags.",
  logoUrl: "/ranoro-logo.png" 
};
type WorkshopInfoType = typeof initialWorkshopInfo;
const LOCALSTORAGE_KEY = 'workshopTicketInfo';

interface ServiceSheetContentProps {
  service: ServiceRecord;
  vehicle?: Vehicle;
}

export const ServiceSheetContent = React.forwardRef<HTMLDivElement, ServiceSheetContentProps>(
  ({ service, vehicle }, ref) => {
    const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfoType>(initialWorkshopInfo);

    useEffect(() => {
        const storedInfo = localStorage.getItem(LOCALSTORAGE_KEY);
        if (storedInfo) {
            try {
                setWorkshopInfo(JSON.parse(storedInfo));
            } catch (e) {
                console.error("Failed to parse workshop info from localStorage", e);
            }
        }
    }, []);

    const serviceDate = parseISO(service.serviceDate ?? "");
    const formattedServiceDate = isValid(serviceDate) ? format(serviceDate, "dd 'de' MMMM 'de' yyyy, HH:mm 'hrs'", { locale: es }) : 'N/A';

    return (
      <div ref={ref} data-format="letter" className="font-sans bg-white text-black shadow-lg mx-auto p-8 text-xs flex flex-col min-h-[10in]">
        {/* Header */}
        <header className="mb-4 pb-2 border-b-2 border-black">
          <div className="flex justify-between items-center">
            <img src={workshopInfo.logoUrl} alt={`${workshopInfo.name} Logo`} className="h-16" data-ai-hint="workshop logo"/>
            <div className="text-right">
              <h1 className="text-2xl font-bold">ORDEN DE SERVICIO</h1>
              <p className="font-mono text-lg">Folio: <span className="font-bold">{service.id}</span></p>
            </div>
          </div>
          <div className="flex justify-between items-end mt-2 text-[10px]">
             <div>
                <p className="font-bold">{workshopInfo.name}</p>
                <p>{workshopInfo.addressLine1}</p>
                {workshopInfo.addressLine2 && <p>{workshopInfo.addressLine2}</p>}
                <p>{workshopInfo.cityState}</p>
                <p>Tel: {workshopInfo.phone}</p>
             </div>
             <div>
                <p><span className="font-bold">Fecha de Recepción:</span> {formattedServiceDate}</p>
             </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow">
          {/* Client & Vehicle Info */}
          <section className="grid grid-cols-2 gap-4 mb-4 text-xs">
            <div className="border border-gray-400 p-2 rounded">
              <h3 className="font-bold text-sm mb-1">DATOS DEL CLIENTE</h3>
              <p><span className="font-semibold">Nombre:</span> {vehicle?.ownerName}</p>
              <p><span className="font-semibold">Teléfono:</span> {vehicle?.ownerPhone}</p>
              <p><span className="font-semibold">Email:</span> {vehicle?.ownerEmail || 'N/A'}</p>
            </div>
            <div className="border border-gray-400 p-2 rounded">
              <h3 className="font-bold text-sm mb-1">DATOS DEL VEHÍCULO</h3>
              <p><span className="font-semibold">Marca/Modelo:</span> {vehicle?.make} {vehicle?.model}</p>
              <p><span className="font-semibold">Año:</span> {vehicle?.year}</p>
              <p><span className="font-semibold">Placas:</span> {vehicle?.licensePlate}</p>
              <p><span className="font-semibold">VIN:</span> {vehicle?.vin || 'N/A'}</p>
              <p><span className="font-semibold">Color:</span> {vehicle?.color || 'N/A'}</p>
              <p><span className="font-semibold">Kilometraje:</span> {service.mileage?.toLocaleString('es-MX') || 'N/A'} km</p>
            </div>
          </section>

          {/* Service Description & Conditions */}
          <section className="grid grid-cols-2 gap-4 mb-4 text-xs">
              <div className="border border-gray-400 p-2 rounded">
                  <h3 className="font-bold text-sm mb-1">SERVICIO SOLICITADO</h3>
                  <p className="whitespace-pre-wrap min-h-[60px]">{service.description}</p>
              </div>
               <div className="border border-gray-400 p-2 rounded">
                  <h3 className="font-bold text-sm mb-1">CONDICIONES DEL VEHÍCULO (AL RECIBIR)</h3>
                  <p className="whitespace-pre-wrap min-h-[60px]">{service.vehicleConditions || 'No especificado.'}</p>
              </div>
          </section>

          {/* Checklist & Fuel */}
          <section className="grid grid-cols-2 gap-4 mb-4 text-xs">
              <div className="border border-gray-400 p-2 rounded">
                  <h3 className="font-bold text-sm mb-1">INVENTARIO DE PERTENENCIAS</h3>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                      <p><span className="font-semibold">Llaves:</span> {service.customerItems?.includes('keys') ? 'Sí' : 'No'}</p>
                      <p><span className="font-semibold">Estéreo:</span> {service.customerItems?.includes('stereo') ? 'Sí' : 'No'}</p>
                      <p><span className="font-semibold">Llanta Ref.:</span> {service.customerItems?.includes('spareTire') ? 'Sí' : 'No'}</p>
                      <p><span className="font-semibold">Herramientas:</span> {service.customerItems?.includes('tools') ? 'Sí' : 'No'}</p>
                  </div>
              </div>
              <div className="border border-gray-400 p-2 rounded">
                  <h3 className="font-bold text-sm mb-1">NIVEL DE COMBUSTIBLE</h3>
                  <p className="font-bold text-center text-lg">{service.fuelLevel || 'N/A'}</p>
              </div>
          </section>
        </main>
        
        {/* Footer */}
        <footer className="mt-auto pt-4 text-xs">
           <section className="mb-2">
                <h4 className="font-bold text-center text-xs mb-1">TÉRMINOS Y CONDICIONES</h4>
                <p className="text-[7px] text-justify leading-tight">
                    1. En virtud de este contrato, Servicio Ranoro presta el servicio de reparación y/o mantenimiento al Cliente (Consumidor), del vehículo cuyas características se detallan en este contrato. 2. El Cliente expresa ser el dueño del vehículo y/o estar facultado para autorizar la reparación y/o mantenimiento del vehículo descrito en el presente contrato, por lo que acepta las condiciones y términos bajo los cuales se realizará la prestación del servicio descrita en dicho contrato. Asimismo, es sabedor de las posibles consecuencias que puede sufrir el vehículo con motivo de su reparación y/o mantenimiento y se responsabiliza de las mismas. 3. El consumidor acepta haber tenido a la vista los precios por mano de obra, partes y/o refacciones a emplear en las operaciones a efectuar por parte de Ranoro, y cuyas refacciones son nuevas y apropiadas para el funcionamiento del vehiculo. 4. Las condiciones generales del vehículo materia de reparación y/o mantenimiento, son señalados en el carátula del presente contrato. 5. Se otorga con garantía por un plazo de 90 días en mano de obra contados a partir de la entrega del vehículo. Para la garantía en partes, piezas, refacciones y accesorios, Ranoro transmitirá la otorgada por el fabricante y/o proveedor. la garantía deberá hacerse válida en las instalaciones de RANORO siempre y cuando no se haya efectuado una reparación por un tercero. El tiempo que dure la reparación y/o mantenimiento del vehículo, bajo la protección de la garantía, no es computable dentro del plazo de la misma. De igual forma, los gastos en que incurra el Cliente para hacer válida la garantía en un domicilio diverso al de Ranoro, deberán ser cubiertos por éste. 6. Ranoro será el responsable por las descomposturas, daños o pérdidas parciales o totales imputables a él mientras el vehículo se encuentre bajo su resguardo para llevar a cabo la prestación del servicio de reparación y/o mantenimiento, o como consecuencia de la prestación del servicio, o bien, en el cumplimiento de la garantía, de acuerdo a lo establecido en el presente contrato. Asimismo, el Cliente autoriza a Ranoro a usar el vehículo para efectos de prueba o verificación de las operaciones a realizar o realizadas. El Cliente libera a Ranoro de cualquier responsabilidad que hubiere surgido o pudiera surgir con relación al origen, propiedad o posesión del vehículo. 7. En caso de que el consumidor cancele la operación, está obligado a pagar de manera inmediata y previa a la entrega del vehículo, el importe de las operaciones efectuadas y partes y/o refacciones colocadas o adquiridas hasta el retiro del mismo. 8. El Consumidor deberá recoger el vehículo, no mas de 24 horas posteriores de haberse notificado, ya sea por teléfono, mensaje o aplicación móvil que el vehículo se encuentra listo, en caso contrario, se obliga a pagar a Ranoro, la cantidad de $300.00 (Trescientos pesos 00/100 M.N.) por concepto de almacenaje del vehículo por cada día que transcurra. Transcurrido un plazo de 15 días naturales a partir de la fecha señalada para la entrega del vehículo, y el Cliente no acuda a recoger el mismo, Ranoro sin responsabilidad alguna, pondrá a disposición de la autoridad correspondiente dicho vehículo. Sin perjuicio de lo anterior, Ranoro podrá realizar el cobro correspondiente por concepto de almacenaje. 9. Ranoro se obliga a expedir la factura o comprobante de pago por las operacionès efectuadas, en la cual se especificarán los precios por mano de obra, refacciones, materiales y accesorios empleados, asi como la garantía que en su caso se otorgue, conforme al artículo 62 de la Ley Federal de Protección al Consumidor.10. Ranoro se obliga a no ceder o transmitir a terceros, con fines mercadotécnicos o publicitarios, los datos e información proporcionada por el consumidor con motivo del presente contrato. 11. Las partes están de acuerdo en someterse a la competencia de la Procuraduría Federal del Consumidor en la vía administrativa para resolver cualquier controversia que se suscite sobre la interpretación o cumplimiento de los términos y condiciones del presente contrato y de las disposiciones de la Ley Federal de Protección al Consumidor, la Norma Oficial Mexicana NOM-17li-SCFI-2007, Prácticas comerciales-Elementos de información para la prestación de servicios en general y cualquier otra disposición aplicable, sin perjuicio del derecho que tienen las partes de someterse a la jurisdicción de los Tribunales competentes del estado de Aguascalientes, renunciando las partes expresamente a cualquier otra jurisdicción que pudiera corresponderles por razón de sus domicilios futuros. 12. El Cliente y Ranoro aceptan la realización de la prestación del servicio de reparación y/o mantenimiento, en los términos establecidos en este contrato, y sabedores de su alcance legal lo firman por duplicado.13. El Cliente y Ranoro aceptan la utilización de aplicaciones móviles (iOS-ANDROID) para enviar, recibir y en su caso aceptar información de trabajos adicionales que se han de realizar a los originalmente contratados por el Consumidor, así como autorizar los mismos por los medios tecnológicos con que se cuente.
                </p>
           </section>
           <div className="grid grid-cols-2 gap-8 text-center mt-4">
              <div>
                  <div className="border-t border-black mt-8 pt-1">
                      <p className="font-bold">FIRMA DE AUTORIZACIÓN CLIENTE</p>
                  </div>
              </div>
               <div>
                  <div className="border-t border-black mt-8 pt-1">
                      <p className="font-bold">FIRMA ASESOR DE SERVICIO</p>
                      <p>{service.serviceAdvisorName || 'N/A'}</p>
                  </div>
              </div>
           </div>
           <div className="text-center mt-12">
               <div className="border-t border-black inline-block px-12 pt-1 font-bold text-base">
                    ACEPTO CONFORME EL VEHÍCULO
               </div>
           </div>
        </footer>
      </div>
    );
  }
);
ServiceSheetContent.displayName = "ServiceSheetContent";
