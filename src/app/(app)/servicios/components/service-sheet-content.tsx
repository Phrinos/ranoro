
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
           <p className="text-center text-[10px] mb-4">
              AUTORIZO la reparación descrita y entiendo que el taller no se hace responsable por objetos de valor no reportados en el inventario. 
              Cualquier trabajo adicional será notificado para su aprobación.
           </p>
           <div className="grid grid-cols-2 gap-8 text-center">
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
               <div className="border-t border-black inline-block px-12 pt-1">
                    <p className="font-bold">FIRMA DE CONFORMIDAD Y ENTREGA</p>
               </div>
           </div>
        </footer>
      </div>
    );
  }
);
ServiceSheetContent.displayName = "ServiceSheetContent";
