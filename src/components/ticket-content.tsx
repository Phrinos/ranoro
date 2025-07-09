
"use client";

import type { SaleReceipt, ServiceRecord, Vehicle, Technician, ServiceItem, WorkshopInfo } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';

const initialWorkshopInfo: WorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  addressLine2: "Jardines de la Concepcion, C.P. 20267",
  cityState: "Aguascalientes, Ags.",
  logoUrl: "/ranoro-logo.png",
  logoWidth: 120,
  fontSize: 10,
  blankLinesTop: 0,
  blankLinesBottom: 0,
};

interface TicketContentProps {
  sale?: SaleReceipt;
  service?: ServiceRecord;
  vehicle?: Vehicle; 
  technician?: Technician; 
  previewWorkshopInfo?: Partial<WorkshopInfo>;
}

export const TicketContent = React.forwardRef<HTMLDivElement, TicketContentProps>(
  ({ sale, service, vehicle, technician, previewWorkshopInfo }, ref) => {
    // Directly use the prop if available, otherwise use the initial default.
    const workshopInfo = { ...initialWorkshopInfo, ...previewWorkshopInfo };
    const { logoWidth, fontSize, blankLinesTop, blankLinesBottom } = workshopInfo;

    const operation = sale || service;
    const operationType = sale ? 'Venta' : 'Servicio';
    const operationId = sale?.id || service?.id;
    
    const operationDateInput = sale?.saleDate || service?.serviceDate;
    let operationDate: Date;
    if (typeof operationDateInput === 'string') {
      operationDate = parseISO(operationDateInput);
    } else if (operationDateInput instanceof Date) {
      operationDate = operationDateInput;
    } else {
      operationDate = new Date(NaN); // Invalid date
    }
    
    const formattedDateTime = isValid(operationDate) ? format(operationDate, "dd/MM/yyyy HH:mm:ss", { locale: es }) : 'N/A';

    const formatCurrency = (amount: number | undefined) => {
      if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
      return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };
    
    const items = sale?.items || [];
    const serviceItems = service?.serviceItems || [];
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
        className="font-mono bg-white text-black px-2 py-4 max-w-[300px] mx-auto leading-tight print:max-w-full print:p-0"
        style={{ fontSize: fontSize ? `${fontSize}px` : '10px' }}
      >
        {Array.from({ length: blankLinesTop || 0 }).map((_, i) => <div key={`top-${i}`} style={{ height: `${fontSize || 10}px` }}></div>)}

        <div className="text-center mb-1 space-y-0 leading-tight">
          <img 
            src={workshopInfo.logoUrl} 
            alt="Logo" 
            className="mx-auto mb-1" 
            style={{ width: logoWidth ? `${logoWidth}px` : '120px' }}
            data-ai-hint="workshop logo"
          />
          <div className="font-semibold">{workshopInfo.name}</div>
          <div>{workshopInfo.addressLine1}</div>
          {workshopInfo.addressLine2 && <div>{workshopInfo.addressLine2}</div>}
          <div>{workshopInfo.cityState}</div>
          <div>Tel: {workshopInfo.phone}</div>
        </div>

        {renderDashedLine()}
        
        <div>Fecha: {formattedDateTime}</div>
        <div>Folio: {operationId}</div>
        {vehicle && <div>Vehículo: {vehicle.make} {vehicle.model} ({vehicle.licensePlate})</div>}
        {sale?.customerName && <div>Cliente: {sale.customerName}</div>}
        {!sale?.customerName && vehicle && <div>Cliente: {vehicle.ownerName}</div>}
        {service?.serviceAdvisorName && <div>Asesor: {service.serviceAdvisorName}</div>}
        {technician && <div>Técnico: {technician.name}</div>}
        
        {renderDashedLine()}

        <div className="font-semibold text-center my-1">DETALLE</div>
        
        <div className="py-0.5 space-y-1">
          {/* For POS Sales */}
          {items.map((item, idx) => {
              const unitPrice = 'unitPrice' in item ? (item.unitPrice || 0) : 0;
              const totalPrice = ('totalPrice' in item && item.totalPrice) ? item.totalPrice : (unitPrice * item.quantity);
              const itemName = 'itemName' in item ? item.itemName : ('supplyName' in item ? item.supplyName : 'Artículo desconocido');
              return (
                  <div key={`sale-${idx}`}>
                      <div className="w-full">{itemName}</div>
                      <div className="flex justify-between">
                          <span>&nbsp;&nbsp;{item.quantity} x {formatCurrency(unitPrice)}</span>
                          <span className="font-medium">{formatCurrency(totalPrice)}</span>
                      </div>
                  </div>
              )
          })}

          {/* For Service Orders */}
          {serviceItems.map((item, idx) => (
            <div key={`service-${idx}`}>
              <div className="flex justify-between font-semibold">
                <span>{item.name}</span>
                <span>{formatCurrency(item.price)}</span>
              </div>
              {item.suppliesUsed.map((supply, supplyIdx) => (
                <div key={`supply-${supplyIdx}`} className="flex justify-between text-neutral-600 pl-2">
                  <span>- {supply.supplyName}</span>
                  <span>Cant: {supply.quantity}</span>
                </div>
              ))}
            </div>
          ))}
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

        {service?.notes && (
            <>
                {renderDashedLine()}
                <div className="mt-1">
                  <div className="font-semibold text-center">NOTAS:</div>
                  <p className="whitespace-pre-wrap text-left">{service.notes}</p>
                </div>
            </>
        )}

        {service?.nextServiceInfo && (
          <>
              {renderDashedLine()}
              <div className="mt-1 text-center">
                <div className="font-semibold">PRÓXIMO SERVICIO</div>
                <p className="text-xs">
                    {format(parseISO(service.nextServiceInfo.date), "dd MMMM yyyy", { locale: es })}
                    {service.nextServiceInfo.mileage && (
                      <>
                        <br/>
                        o a los {service.nextServiceInfo.mileage.toLocaleString('es-MX')} km
                      </>
                    )}
                </p>
              </div>
          </>
        )}

        {renderDashedLine()}

        <div className="text-center mt-1 space-y-0">
            <div className="font-semibold">¡Gracias por su preferencia!</div>
            <div>Para dudas o aclaraciones, no dude en contactarnos.</div>
        </div>

        {Array.from({ length: blankLinesBottom || 0 }).map((_, i) => <div key={`bottom-${i}`} style={{ height: `${fontSize || 10}px` }}></div>)}
      </div>
    );
  }
);

TicketContent.displayName = "TicketContent";
