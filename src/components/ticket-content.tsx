
"use client";

import type { SaleReceipt, ServiceRecord, Vehicle, Technician } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';

const initialWorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  addressLine2: "Jardines de la Concepcion, C.P. 20267",
  cityState: "Aguascalientes, Ags.",
  logoUrl: "/ranoro-logo.png"
};

type WorkshopInfoType = typeof initialWorkshopInfo;

interface TicketContentProps {
  sale?: SaleReceipt;
  service?: ServiceRecord;
  vehicle?: Vehicle; 
  technician?: Technician; 
  previewWorkshopInfo?: WorkshopInfoType;
}

const LOCALSTORAGE_KEY = 'workshopTicketInfo';
const IVA_RATE = 0.16;

export const TicketContent = React.forwardRef<HTMLDivElement, TicketContentProps>(
  ({ sale, service, vehicle, technician, previewWorkshopInfo }, ref) => {
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfoType>(initialWorkshopInfo);

  useEffect(() => {
    const infoSource = previewWorkshopInfo 
      ? { ...initialWorkshopInfo, ...previewWorkshopInfo }
      : initialWorkshopInfo;

    if (typeof window !== 'undefined' && !previewWorkshopInfo) {
      const storedInfo = localStorage.getItem(LOCALSTORAGE_KEY);
      try {
        setWorkshopInfo(storedInfo ? { ...infoSource, ...JSON.parse(storedInfo) } : infoSource);
      } catch (e) {
        console.error("Failed to parse workshop info from localStorage", e);
        setWorkshopInfo(infoSource);
      }
    } else {
      setWorkshopInfo(infoSource);
    }
  }, [previewWorkshopInfo]);

  const operation = sale || service;
  const operationType = sale ? 'Venta' : 'Servicio';
  const operationId = sale?.id || service?.id;
  const operationDateStr = sale?.saleDate || service?.serviceDate;
  const operationDate = operationDateStr ? parseISO(operationDateStr) : new Date();

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'N/A';
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const items = sale?.items || service?.suppliesUsed || [];
  const subTotal = sale?.subTotal || service?.subTotal || 0;
  const tax = sale?.tax || service?.taxAmount || 0;
  const totalAmount = sale?.totalAmount || service?.totalCost || 0;

  return (
    <div 
      id="ticketToExport"
      ref={ref}
      className="font-sans bg-white text-black shadow-lg printable-content mx-auto w-[794px] min-h-[1020px] p-16 text-[13px] md:text-[14px] lg:text-[15px]"
    >
      <header className="flex justify-between items-start mb-8 border-b border-gray-300 pb-4">
        <div>
          <Image 
            src={workshopInfo.logoUrl} 
            alt={`${workshopInfo.name} Logo`} 
            width={180} 
            height={60} 
            className="mb-3"
            data-ai-hint="workshop logo"
            priority
          />
          <h1 className="text-2xl font-bold text-gray-800">{workshopInfo.name}</h1>
          <p>{workshopInfo.addressLine1}</p>
          {workshopInfo.addressLine2 && <p>{workshopInfo.addressLine2}</p>}
          <p>{workshopInfo.cityState}</p>
          <p>Tel: {workshopInfo.phone}</p>
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-semibold text-primary uppercase">{operationType === 'Venta' ? 'Recibo de Venta' : 'Orden de Servicio'}</h2>
          <p className="mt-2">Folio: <span className="font-medium">{operationId}</span></p>
          <p>Fecha: <span className="font-medium">{isValid(operationDate) ? format(operationDate, "dd 'de' MMMM 'de' yyyy", { locale: es }) : 'N/A'}</span></p>
        </div>
      </header>

      {(vehicle || sale?.customerName) && (
        <section className="grid grid-cols-2 gap-8 mb-8">
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">Cliente:</h3>
            {vehicle ? (
                <>
                    <p>{vehicle.ownerName}</p>
                    <p>{vehicle.ownerPhone}</p>
                    <p>{vehicle.ownerEmail}</p>
                </>
            ) : <p>{sale?.customerName}</p>}
          </div>
          {vehicle && (
             <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-2 border-b pb-1">Vehículo:</h3>
                <p>{`${vehicle.make} ${vehicle.model} (${vehicle.year})`}</p>
                <p>Placas: {vehicle.licensePlate}</p>
                <p>VIN: {vehicle.vin || 'N/A'}</p>
                {service?.mileage !== undefined && <p>Kilometraje: {service.mileage.toLocaleString('es-ES')} km</p>}
            </div>
          )}
        </section>
      )}
      
      {service && (
        <section className="mb-8">
            <h3 className="font-semibold text-base text-gray-700 mb-2 border-b pb-2">Descripción del Servicio:</h3>
            <p className="text-gray-800 whitespace-pre-wrap">{service.description}</p>
        </section>
      )}

      {items.length > 0 && (
        <section className="mb-8">
          <h3 className="font-semibold text-base text-gray-700 mb-3">Detalle:</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-100">
                <th className="py-2 px-3 font-semibold text-gray-600">Cantidad</th>
                <th className="py-2 px-3 font-semibold text-gray-600">Descripción</th>
                <th className="py-2 px-3 font-semibold text-gray-600 text-right">Precio Unit. (IVA Inc.)</th>
                <th className="py-2 px-3 font-semibold text-gray-600 text-right">Importe (IVA Inc.)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                  const unitPrice = 'unitPrice' in item ? (item.unitPrice || 0) : 0;
                  const totalPrice = 'totalPrice' in item ? (item.totalPrice || unitPrice * item.quantity) : (unitPrice * item.quantity);
                  const itemName = 'itemName' in item ? item.itemName : ('supplyName' in item ? item.supplyName : 'Artículo desconocido');
                  return (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2 px-3">{item.quantity}</td>
                      <td className="py-2 px-3">{itemName}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(unitPrice)}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(totalPrice)}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </section>
      )}
      
      <section className="flex justify-end mb-8">
        <div className="w-full max-w-sm space-y-2">
          {subTotal > 0 && <div><span className="text-gray-700">Subtotal:</span><span className="float-right">{formatCurrency(subTotal)}</span></div>}
          {tax > 0 && <div><span className="text-gray-700">IVA ({(IVA_RATE * 100).toFixed(0)}%):</span><span className="float-right">{formatCurrency(tax)}</span></div>}
          <div className="border-t-2 pt-2 border-gray-300"><span className="font-bold text-lg text-primary">Total:</span><span className="float-right font-bold text-lg text-primary">{formatCurrency(totalAmount)}</span></div>
        </div>
      </section>

      <footer className="text-xs text-gray-600 mt-auto border-t border-gray-300 pt-4">
        <div className="text-center space-y-1">
          <p className="font-semibold">¡Gracias por su preferencia!</p>
          <p>Para cualquier duda o aclaración, no dude en contactarnos.</p>
        </div>
      </footer>
    </div>
  );
});

TicketContent.displayName = "TicketContent";
