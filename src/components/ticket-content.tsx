
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
  const formattedDateTime = isValid(operationDate) ? format(operationDate, "dd/MM/yyyy HH:mm:ss", { locale: es }) : 'N/A';

  const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const items = sale?.items || service?.suppliesUsed || [];
  const subTotal = sale?.subTotal || service?.subTotal || 0;
  const tax = sale?.tax || service?.taxAmount || 0;
  const totalAmount = sale?.totalAmount || service?.totalCost || 0;

  const renderLine = (label: string, value: string, isBold: boolean = false) => (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={isBold ? "font-semibold" : ""}>{value}</span>
    </div>
  );

  const renderDashedLine = () => (
    <div className="border-t border-dashed border-neutral-400 my-1"></div>
  );

  return (
    <div 
      id="ticketToExport"
      ref={ref}
      data-format="receipt"
      className="font-mono bg-white text-black p-2 ticket-preview-content max-w-[300px] mx-auto text-[10px] leading-tight print:max-w-full print:text-[9px] print:p-0"
    >
      <div className="text-center mb-2">
        <img src={workshopInfo.logoUrl} alt="Logo" className="w-32 mx-auto mb-1" data-ai-hint="workshop logo"/>
        <h1 className="text-base font-bold">{workshopInfo.name}</h1>
        <p>{workshopInfo.addressLine1}</p>
        {workshopInfo.addressLine2 && <p>{workshopInfo.addressLine2}</p>}
        <p>{workshopInfo.cityState}</p>
        <p>Tel: {workshopInfo.phone}</p>
      </div>

      {renderDashedLine()}
      
      <p>Folio: {operationId}</p>
      <p>Fecha: {formattedDateTime}</p>
      {sale?.customerName && <p>Cliente: {sale.customerName}</p>}
      {vehicle && (
        <>
          <p>Cliente: {vehicle.ownerName}</p>
          <p>Vehículo: {vehicle.make} {vehicle.model} ({vehicle.licensePlate})</p>
        </>
      )}
      {technician && <p>Atendió: {technician.name}</p>}
      
      {renderDashedLine()}

      {service?.description && (
        <>
          <p className="font-semibold text-center my-1">SERVICIO REALIZADO</p>
          <p className="whitespace-pre-wrap text-left mb-1">{service.description}</p>
          {renderDashedLine()}
        </>
      )}
      
      <div className="font-semibold text-center my-1">DETALLE</div>
      
      {items.map((item, idx) => {
          const unitPrice = 'unitPrice' in item ? (item.unitPrice || 0) : 0;
          const totalPrice = ('totalPrice' in item && item.totalPrice) ? item.totalPrice : (unitPrice * item.quantity);
          const itemName = 'itemName' in item ? item.itemName : ('supplyName' in item ? item.supplyName : 'Artículo desconocido');
          return (
              <div key={idx} className="mb-0.5">
                  <p className="truncate">{itemName}</p>
                  <div className="flex justify-between">
                      <span>&nbsp;&nbsp;{item.quantity} x {formatCurrency(unitPrice)}</span>
                      <span className="font-medium">{formatCurrency(totalPrice)}</span>
                  </div>
              </div>
          )
      })}

      {renderDashedLine()}

      <div className="space-y-0.5 mt-1">
          {renderLine("Subtotal:", formatCurrency(subTotal))}
          {renderLine(`IVA:`, formatCurrency(tax))}
          {renderLine("TOTAL:", formatCurrency(totalAmount), true)}
      </div>
      
      {sale?.paymentMethod && (
          <>
              {renderDashedLine()}
              <p className="text-center">Pagado con: {sale.paymentMethod}</p>
          </>
      )}

      {renderDashedLine()}

      <div className="text-center mt-2 space-y-1">
          <p className="font-semibold">¡Gracias por su preferencia!</p>
          <p>Para dudas o aclaraciones, no dude en contactarnos.</p>
      </div>
    </div>
  );
});

TicketContent.displayName = "TicketContent";
