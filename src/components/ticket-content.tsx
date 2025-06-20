
"use client";

import type { SaleReceipt, ServiceRecord, Vehicle, Technician } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';

const initialWorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  addressLine2: "Jardines de la Concepcion, C.P. 20267",
  cityState: "Aguascalientes, Ags.",
};

type WorkshopInfoType = typeof initialWorkshopInfo;

interface TicketContentProps {
  sale?: SaleReceipt;
  service?: ServiceRecord;
  vehicle?: Vehicle; 
  technician?: Technician; 
  previewWorkshopInfo?: WorkshopInfoType;
}

const IVA_RATE = 0.16;
const LOCALSTORAGE_KEY = 'workshopTicketInfo';

export function TicketContent({ sale, service, vehicle, technician, previewWorkshopInfo }: TicketContentProps) {
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfoType>(initialWorkshopInfo);

  useEffect(() => {
    if (previewWorkshopInfo) {
      setWorkshopInfo(previewWorkshopInfo);
    } else {
      const storedInfo = localStorage.getItem(LOCALSTORAGE_KEY);
      if (storedInfo) {
        try {
          setWorkshopInfo(JSON.parse(storedInfo));
        } catch (e) {
          console.error("Failed to parse workshop info from localStorage", e);
          setWorkshopInfo(initialWorkshopInfo);
        }
      } else {
        setWorkshopInfo(initialWorkshopInfo);
      }
    }
  }, [previewWorkshopInfo]);


  const now = new Date();
  const formattedPrintDate = format(now, "dd/MM/yyyy HH:mm:ss", { locale: es });

  const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00'; // Safeguard for NaN/undefined
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderLine = (label: string, value: string, isBoldValue: boolean = false) => (
    <div className="flex justify-between text-xs">
      <span>{label}</span>
      <span className={isBoldValue ? "font-semibold" : ""}>{value}</span>
    </div>
  );

  const renderDashedLine = () => (
    <div className="border-t border-dashed border-neutral-400 my-1"></div>
  );
  
  const getOperationDate = () => {
    if (sale?.saleDate) return parseISO(sale.saleDate);
    if (service?.serviceDate) return parseISO(service.serviceDate);
    return now; // Fallback to current date if no operation date
  };
  const operationDate = getOperationDate();
  const formattedOperationDate = isValid(operationDate) ? format(operationDate, "dd/MM/yy HH:mm", { locale: es }) : 'N/A';

  // Safeguard values for service ticket display
  const serviceTotalCost = (typeof service?.totalCost === 'number' && !isNaN(service.totalCost)) ? service.totalCost : 0;
  const serviceSubTotal = (typeof service?.subTotal === 'number' && !isNaN(service.subTotal)) ? service.subTotal : serviceTotalCost / (1 + IVA_RATE);
  const serviceTaxAmount = (typeof service?.taxAmount === 'number' && !isNaN(service.taxAmount)) ? service.taxAmount : serviceTotalCost - serviceSubTotal;


  return (
    <div className="font-mono bg-white text-black p-2 ticket-preview-content max-w-[300px] mx-auto text-[10px] leading-tight print:max-w-full print:text-[9px] print:p-0 pt-5 pb-5">
      <div className="text-center mb-2">
        <h1 className="text-lg font-bold">{workshopInfo.name}</h1>
        <p>{workshopInfo.phone}</p>
        <p>{workshopInfo.addressLine1}</p>
        {workshopInfo.addressLine2 && <p>{workshopInfo.addressLine2}</p>}
        <p>{workshopInfo.cityState}</p>
      </div>

      <p className="text-xs">Fecha Impresión: {formattedPrintDate}</p>
      {sale && <p className="text-xs">Folio Venta: {sale.id} ({formattedOperationDate})</p>}
      {service && <p className="text-xs">Folio Servicio: {service.id} ({formattedOperationDate})</p>}
      {sale?.customerName && <p className="text-xs">Cliente: {sale.customerName}</p>}
      
      {renderDashedLine()}

      {sale && (
        <>
          <div className="text-center font-semibold my-1">DETALLE DE VENTA</div>
          {sale.items.map((item, index) => (
            <div key={index} className="my-0.5">
              <p>{item.quantity} x {item.itemName}</p>
              <div className="flex justify-end">
                <span>@ {formatCurrency(item.unitPrice / (1 + IVA_RATE))} c/u</span>
                <span className="ml-2 w-16 text-right">{formatCurrency(item.totalPrice / (1 + IVA_RATE))}</span>
              </div>
            </div>
          ))}
          {renderDashedLine()}
          {renderLine("SUBTOTAL:", formatCurrency(sale.subTotal))}
          {renderLine(`IVA (${(IVA_RATE * 100).toFixed(0)}%):`, formatCurrency(sale.tax))}
          {renderLine("TOTAL:", formatCurrency(sale.totalAmount), true)}
          {renderDashedLine()}
          <p className="text-xs">Método Pago: {sale.paymentMethod}</p>
          {sale.cardFolio && <p className="text-xs">Folio Tarjeta: {sale.cardFolio}</p>}
          {sale.transferFolio && <p className="text-xs">Folio Transf: {sale.transferFolio}</p>}
        </>
      )}

      {service && (
        <>
          <div className="text-center font-semibold my-1">DETALLE DE SERVICIO</div>
          {vehicle && (
            <>
              <p>Vehículo: {vehicle.make} {vehicle.model} ({vehicle.year})</p>
              <p>Placas: {vehicle.licensePlate}</p>
            </>
          )}
          {technician && <p>Técnico: {technician.name}</p>}
          <p className="my-1">Descripción: {service.description}</p>
          {service.suppliesUsed && service.suppliesUsed.length > 0 && (
            <>
              <p className="font-semibold mt-1">Refacciones:</p>
              {service.suppliesUsed.map((supply, idx) => (
                <div key={idx} className="text-xs">
                  <span>{supply.quantity} x {supply.supplyName || `ID: ${supply.supplyId}`}</span>
                </div>
              ))}
            </>
          )}
          {renderDashedLine()}
          {renderLine("SUBTOTAL SERVICIO:", formatCurrency(serviceSubTotal))}
          {renderLine(`IVA (${(IVA_RATE*100).toFixed(0)}%):`, formatCurrency(serviceTaxAmount))}
          {renderLine("TOTAL SERVICIO:", formatCurrency(serviceTotalCost), true)}
           {service.deliveryDateTime && isValid(parseISO(service.deliveryDateTime)) && (
            <p className="text-xs mt-1">Fecha Entrega: {format(parseISO(service.deliveryDateTime), "dd/MM/yy HH:mm", { locale: es })}</p>
           )}
        </>
      )}

      {renderDashedLine()}
      <p className="text-center text-xs mt-2">¡Gracias por su preferencia!</p>
    </div>
  );
}

