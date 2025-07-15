
"use client";

import type { SaleReceipt, ServiceRecord, Vehicle, Technician, ServiceItem, WorkshopInfo } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import React from 'react';
import { cn } from "@/lib/utils";
import { parseDate } from '@/lib/forms';

const initialWorkshopInfo: WorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  addressLine2: "Jardines de la Concepcion, C.P. 20267",
  cityState: "Aguascalientes, Ags.",
  logoUrl: "/ranoro-logo.png",
  logoWidth: 120,
  headerFontSize: 10,
  bodyFontSize: 10,
  itemsFontSize: 10,
  totalsFontSize: 10,
  footerFontSize: 10,
  blankLinesTop: 0,
  blankLinesBottom: 0,
  footerLine1: "¡Gracias por su preferencia!",
  footerLine2: "Para dudas o aclaraciones, no dude en contactarnos.",
  fixedFooterText: "© 2025 Ranoro® Sistema de Administracion de Talleres. Todos los derechos reservados - Diseñado y Desarrollado por Arturo Valdelamar +524493930914",
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
    const workshopInfo = { ...initialWorkshopInfo, ...previewWorkshopInfo };
    const { 
        logoWidth, blankLinesTop, blankLinesBottom, 
        headerFontSize, bodyFontSize, itemsFontSize, totalsFontSize, footerFontSize,
        name, nameBold, phone, phoneBold, addressLine1, addressLine1Bold,
        addressLine2, addressLine2Bold, cityState, cityStateBold,
        footerLine1, footerLine1Bold, footerLine2, footerLine2Bold,
        fixedFooterText, fixedFooterTextBold
    } = workshopInfo;

    const operation = sale || service;
    const operationId = sale?.id || service?.id;
    
    // Corrected: Always use the current time for ticket generation
    const formattedDateTime = format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: es });

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
      >
        {Array.from({ length: blankLinesTop || 0 }).map((_, i) => <div key={`top-${i}`} style={{ height: `10px` }}>&nbsp;</div>)}

        <div className="text-center mb-1 space-y-0 leading-tight">
          {workshopInfo.logoUrl && (
            <img 
              src={workshopInfo.logoUrl} 
              alt="Logo" 
              className="mx-auto mb-1" 
              style={{ width: logoWidth ? `${logoWidth}px` : '120px' }}
              data-ai-hint="workshop logo"
              crossOrigin="anonymous"
            />
          )}
          <div style={{ fontSize: `${headerFontSize}px` }}>
              <p className={cn({"font-bold": nameBold})}>{name}</p>
              <p className={cn({"font-bold": addressLine1Bold})}>{addressLine1}</p>
              {addressLine2 && <p className={cn({"font-bold": addressLine2Bold})}>{addressLine2}</p>}
              {cityState && <p className={cn({"font-bold": cityStateBold})}>{cityState}</p>}
              <p className={cn({"font-bold": phoneBold})}>Tel: {phone}</p>
          </div>
        </div>

        {renderDashedLine()}
        
        <div style={{ fontSize: `${bodyFontSize}px` }}>
            <div>Fecha: {formattedDateTime}</div>
            <div>Folio: {operationId}</div>
            {vehicle && <div>Vehículo: {vehicle.make} {vehicle.model} ({vehicle.licensePlate})</div>}
            {sale?.customerName && <div>Cliente: {sale.customerName}</div>}
            {!sale?.customerName && vehicle && <div>Cliente: {vehicle.ownerName}</div>}
            {service?.serviceAdvisorName && <div>Asesor: {service.serviceAdvisorName}</div>}
            {technician && <div>Técnico: {technician.name}</div>}
        </div>
        
        {renderDashedLine()}

        <div className="font-semibold text-center my-1" style={{ fontSize: `${bodyFontSize}px` }}>DETALLE</div>
        
        <div className="py-0.5 space-y-1" style={{ fontSize: `${itemsFontSize}px` }}>
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

        <div className="space-y-0 mt-1" style={{ fontSize: `${totalsFontSize}px` }}>
            {renderLine("Subtotal:", formatCurrency(subTotal))}
            {renderLine(`IVA:`, formatCurrency(tax))}
            <div className={cn("flex justify-between", {"font-bold": true})}>
                <span>TOTAL:</span>
                <span>{formatCurrency(totalAmount)}</span>
            </div>
        </div>
        
        {operation?.paymentMethod && (
            <>
                {renderDashedLine()}
                <div className="text-center" style={{ fontSize: `${bodyFontSize}px` }}>Pagado con: {operation.paymentMethod}</div>
            </>
        )}

        {service?.notes && (
            <>
                {renderDashedLine()}
                <div className="mt-1" style={{ fontSize: `${bodyFontSize}px` }}>
                  <div className="font-semibold text-center">NOTAS:</div>
                  <p className="whitespace-pre-wrap text-left">{service.notes}</p>
                </div>
            </>
        )}

        {service?.nextServiceInfo && service.nextServiceInfo.date && isValid(parseDate(service.nextServiceInfo.date)!) && (
          <>
              {renderDashedLine()}
              <div className="mt-1 text-center" style={{ fontSize: `${bodyFontSize}px` }}>
                <div className="font-semibold">PRÓXIMO SERVICIO</div>
                <p className="text-xs">
                    {format(parseDate(service.nextServiceInfo.date)!, "dd MMMM yyyy", { locale: es })}
                    {service.nextServiceInfo.mileage && typeof service.nextServiceInfo.mileage === 'number' && isFinite(service.nextServiceInfo.mileage) && (
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

        <div className="text-center mt-1 space-y-0" style={{ fontSize: `${footerFontSize}px` }}>
            <div className={cn({ "font-bold": footerLine1Bold })}>{footerLine1}</div>
            <div className={cn({ "font-bold": footerLine2Bold })}>{footerLine2}</div>
        </div>

        {fixedFooterText && (
          <>
            {renderDashedLine()}
            <div className="text-center mt-1 text-[8px] whitespace-pre-wrap" style={{ fontSize: `${footerFontSize ? footerFontSize - 2 : 8}px` }}>
              <p className={cn({ "font-bold": fixedFooterTextBold })}>{fixedFooterText}</p>
            </div>
          </>
        )}

        {Array.from({ length: blankLinesBottom || 0 }).map((_, i) => <div key={`bottom-${i}`} style={{ height: `10px` }}>&nbsp;</div>)}
      </div>
    );
  }
);

TicketContent.displayName = "TicketContent";
