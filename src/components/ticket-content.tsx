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
    <div className="border-t border-dashed border-neutral-400 mt-2 mb-1"></div>
  );

  return (
    <div 
      ref={ref}
      data-format="receipt"
      className="font-mono bg-white text-black px-2 py-4 max-w-[300px] mx-auto text-[10px] leading-tight print:max-w-full print:text-[9px] print:p-0"
    >
      <div className="text-center mb-1 space-y-0 leading-tight">
        <img src={workshopInfo.logoUrl} alt="Logo" className="w-32 mx-auto mb-1" data-ai-hint="workshop logo"/>
        <div className="font-semibold">{workshopInfo.name}</div>
        <div>{workshopInfo.addressLine1}</div>
        {workshopInfo.addressLine2 && <div>{workshopInfo.addressLine2}</div>}
        <div>{workshopInfo.cityState}</div>
        <div>Tel: {workshopInfo.phone}</div>
      </div>

      {renderDashedLine()}
      
      <div>Folio: {operationId}</div>
      <div>Fecha: {formattedDateTime}</div>
      {sale?.customerName && <div>Cliente: {sale.customerName}</div>}
      {vehicle && (
        <>
          <div>Cliente: {vehicle.ownerName}</div>
          <div>Vehículo: {vehicle.make} {vehicle.model} ({vehicle.licensePlate})</div>
        </>
      )}
      {technician && <div>Atendió: {technician.name}</div>}
      
      {renderDashedLine()}

      {service?.description && (
        <>
          <div className="font-semibold text-center my-1">SERVICIO REALIZADO</div>
          <div className="whitespace-pre-wrap text-left mb-1">{service.description}</div>
          {renderDashedLine()}
        </>
      )}
      
      <div className="font-semibold text-center my-1">DETALLE</div>
      
      <div className="py-0.5 space-y-1">
        {items.map((item, idx) => {
            const unitPrice = 'unitPrice' in item ? (item.unitPrice || 0) : 0;
            const totalPrice = ('totalPrice' in item && item.totalPrice) ? item.totalPrice : (unitPrice * item.quantity);
            const itemName = 'itemName' in item ? item.itemName : ('supplyName' in item ? item.supplyName : 'Artículo desconocido');
            return (
                <div key={idx}>
                    <div className="w-full">{itemName}</div>
                    <div className="flex justify-between">
                        <span>&nbsp;&nbsp;{item.quantity} x {formatCurrency(unitPrice)}</span>
                        <span className="font-medium">{formatCurrency(totalPrice)}</span>
                    </div>
                </div>
            )
        })}
      </div>

      {renderDashedLine()}

      <div className="space-y-0 mt-1">
          {renderLine("Subtotal:", formatCurrency(subTotal))}
          {renderLine(`IVA:`, formatCurrency(tax))}
          {renderLine("TOTAL:", formatCurrency(totalAmount), true)}
      </div>
      
      {sale?.paymentMethod && (
          <>
              {renderDashedLine()}
              <div className="text-center">Pagado con: {sale.paymentMethod}</div>
          </>
      )}

      {renderDashedLine()}

      <div className="text-center mt-1 space-y-0">
          <div className="font-semibold">¡Gracias por su preferencia!</div>
          <div>Para dudas o aclaraciones, no dude en contactarnos.</div>
      </div>
    </div>
  );
});

TicketContent.displayName = "TicketContent";
