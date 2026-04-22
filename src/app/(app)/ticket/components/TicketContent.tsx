// src/app/(app)/ticket/components/TicketContent.tsx
// Single source of truth for 80mm receipt-format ticket rendering.
"use client";

import type { SaleReceipt, ServiceRecord, Vehicle, User } from '@/types';
import { format, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import { cn, formatCurrency, formatNumber, normalizeDataUrl } from "@/lib/utils";
import { parseDate } from '@/lib/forms';
import Image from 'next/image';
import type { TicketSettings } from '@/lib/constants/app';
import { defaultTicketSettings } from '@/lib/constants/app';

export interface TicketContentProps {
  sale?: SaleReceipt;
  service?: ServiceRecord;
  vehicle?: Vehicle;
  technician?: User;
  /** Pass workshop branding overrides (logo, name, footer, etc.) */
  previewWorkshopInfo?: Partial<TicketSettings>;
}

const IVA_RATE = 0.16;

/**
 * 80mm receipt-format ticket.
 * Renders a sale (SaleReceipt) or a service (ServiceRecord).
 * Used as the *single* ticket rendering component across the entire app.
 */
export const TicketContent = React.forwardRef<HTMLDivElement, TicketContentProps>(
  ({ sale, service, vehicle, technician, previewWorkshopInfo }, ref) => {
    const settings: TicketSettings = { ...defaultTicketSettings, ...(previewWorkshopInfo || {}) };

    const {
      logoWidth, blankLinesTop, blankLinesBottom,
      headerFontSize, bodyFontSize, itemsFontSize, totalsFontSize, footerFontSize,
      name, nameBold, phone, phoneBold, addressLine1, addressLine1Bold,
      addressLine2, addressLine2Bold, cityState, cityStateBold,
      footerLine1, footerLine1Bold, footerLine2, footerLine2Bold,
      fixedFooterText, fixedFooterTextBold, logoUrl,
    } = settings;

    const operation = sale || service;
    const operationId = sale?.id || service?.folio || service?.id;

    const operationDate = useMemo(() => {
      if (sale) return parseDate(sale.saleDate);
      if (service) return parseDate(service.deliveryDateTime) || parseDate(service.serviceDate);
      return new Date();
    }, [sale, service]);

    const formattedOperationDateTime =
      operationDate && isValid(operationDate)
        ? format(operationDate, "dd/MM/yyyy HH:mm:ss", { locale: es })
        : 'N/A';

    const formattedPrintDateTime = format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: es });

    const calculatedTotals = useMemo(() => {
      if (sale) {
        return { subTotal: sale.subTotal || 0, tax: sale.tax || 0, totalAmount: sale.totalAmount || 0 };
      }
      if (service) {
        const itemsTotal = (service.serviceItems || []).reduce(
          (sum, item) => sum + (Number(item.sellingPrice) || 0), 0
        );
        const subTotal = itemsTotal / (1 + IVA_RATE);
        const tax = itemsTotal - subTotal;
        return { subTotal, tax, totalAmount: itemsTotal };
      }
      return { subTotal: 0, tax: 0, totalAmount: 0 };
    }, [sale, service]);

    const { subTotal, tax, totalAmount } = calculatedTotals;
    const items = sale?.items || [];
    const serviceItems = service?.serviceItems || [];

    const customerNameToDisplay =
      sale?.customerName || service?.customerName || vehicle?.ownerName || 'Cliente Mostrador';

    const renderLine = (label: string, value: string, isBold = false) => (
      <div className="flex justify-between">
        <span>{label}</span>
        <span className={cn(isBold && "font-semibold")}>{value}</span>
      </div>
    );

    const renderDashedLine = () => (
      <div className="border-t border-dashed border-neutral-400 mt-2 mb-1" />
    );

    return (
      <div
        ref={ref}
        data-format="receipt"
        // 80mm paper ≈ 302px at 96 dpi (80mm × 96 / 25.4 ≈ 302)
        className="font-mono bg-white text-black p-2 mx-auto"
        style={{ width: '302px', minWidth: '302px', maxWidth: '302px' }}
      >
        {Array.from({ length: blankLinesTop || 0 }).map((_, i) => (
          <div key={`top-${i}`} style={{ height: '10px' }}>&nbsp;</div>
        ))}

        {/* Header */}
        <div className="text-center mb-1 space-y-0 leading-tight">
          {logoUrl && (
            <div
              className="mx-auto mb-1 relative"
              style={{ width: logoWidth ? `${logoWidth}px` : '120px', height: `${(logoWidth || 120) / 3}px` }}
            >
              <Image
                src={logoUrl}
                alt="Logo"
                fill
                style={{ objectFit: 'contain' }}
                crossOrigin="anonymous"
                unoptimized
              />
            </div>
          )}
          <div style={{ fontSize: `${headerFontSize}px` }}>
            <p className={cn({ "font-bold": !!nameBold })}>{name}</p>
            <p className={cn({ "font-bold": !!addressLine1Bold })}>{addressLine1}</p>
            {addressLine2 && <p className={cn({ "font-bold": !!addressLine2Bold })}>{addressLine2}</p>}
            {cityState && <p className={cn({ "font-bold": !!cityStateBold })}>{cityState}</p>}
            <p className={cn({ "font-bold": !!phoneBold })}>Tel: {phone}</p>
          </div>
        </div>

        {renderDashedLine()}

        {/* Document info */}
        <div style={{ fontSize: `${bodyFontSize}px` }}>
          <div>Fecha: {formattedOperationDateTime}</div>
          <div>Impreso el: {formattedPrintDateTime}</div>
          <div>Folio: {operationId}</div>
          {vehicle && (
            <div>Vehículo: {vehicle.make} {vehicle.model} ({vehicle.licensePlate})</div>
          )}
          <div>Cliente: {customerNameToDisplay}</div>
          {service?.serviceAdvisorName && <div>Asesor: {service.serviceAdvisorName}</div>}
          {technician && <div>Técnico: {technician.name}</div>}
        </div>

        {renderDashedLine()}

        <div className="font-semibold text-center my-1" style={{ fontSize: `${bodyFontSize}px` }}>
          DETALLE
        </div>

        {/* Items */}
        <div className="py-0.5 space-y-1" style={{ fontSize: `${itemsFontSize}px` }}>
          {(items as any[])
            .filter((item: any) => item.inventoryItemId !== 'COMMISSION_FEE')
            .map((item: any, idx: number) => {
              const unitPrice = 'unitPrice' in item
                ? item.unitPrice
                : ('total' in item && 'quantity' in item ? item.total / item.quantity : 0);
              const totalPrice = 'totalPrice' in item
                ? item.totalPrice
                : ('total' in item ? item.total : unitPrice * item.quantity);
              const itemName = 'itemName' in item
                ? item.itemName
                : ('supplyName' in item ? item.supplyName : 'Artículo');
              return (
                <div key={`sale-${idx}`}>
                  <div className="w-full">{itemName}</div>
                  <div className="flex justify-between">
                    <span>&nbsp;&nbsp;{item.quantity} x {formatCurrency(unitPrice)}</span>
                    <span className="font-medium">{formatCurrency(totalPrice)}</span>
                  </div>
                </div>
              );
            })}

          {serviceItems.map((item, idx) => (
            <div key={`service-${idx}`}>
              <div className="flex justify-between font-semibold">
                <span>{item.itemName || item.name}</span>
                <span>{formatCurrency(item.sellingPrice)}</span>
              </div>
              {item.suppliesUsed && item.suppliesUsed.length > 0 &&
                item.suppliesUsed.map((supply, supplyIdx) => (
                  <div key={`supply-${supplyIdx}`} className="flex justify-between text-neutral-600 pl-2">
                    <span>- {supply.supplyName}</span>
                    <span>Cant: {supply.quantity}</span>
                  </div>
                ))
              }
            </div>
          ))}
        </div>

        {renderDashedLine()}

        {/* Totals */}
        <div className="space-y-0 mt-1" style={{ fontSize: `${totalsFontSize}px` }}>
          {renderLine("Subtotal:", formatCurrency(subTotal))}
          {renderLine("IVA:", formatCurrency(tax))}
          <div className="flex justify-between font-bold">
            <span>TOTAL:</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Payments */}
        {operation?.payments && operation.payments.length > 0 && (
          <>
            {renderDashedLine()}
            <div className="text-center" style={{ fontSize: `${bodyFontSize}px` }}>
              <p className="font-bold">Forma(s) de Pago:</p>
              <div className="text-center text-xs">
                {operation.payments.map((p, index) => (
                  <p key={index}>
                    {p.method}: {formatCurrency(p.amount)}
                    {p.folio && ` (Folio: ${p.folio})`}
                  </p>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Próximo servicio */}
        {service?.nextServiceInfo?.date &&
          isValid(parseDate(service.nextServiceInfo.date)!) && (
            <>
              {renderDashedLine()}
              <div className="mt-1 text-center" style={{ fontSize: `${bodyFontSize}px` }}>
                <div className="font-semibold">PRÓXIMO SERVICIO</div>
                <p className="text-xs">
                  {format(parseDate(service.nextServiceInfo.date)!, "dd MMMM yyyy", { locale: es })}
                  {service.nextServiceInfo.mileage &&
                    typeof service.nextServiceInfo.mileage === 'number' &&
                    isFinite(service.nextServiceInfo.mileage) && (
                      <><br />o a los {formatNumber(service.nextServiceInfo.mileage)} km</>
                    )}
                </p>
              </div>
            </>
          )}

        {renderDashedLine()}

        {/* Footer */}
        <div className="text-center mt-1 space-y-0" style={{ fontSize: `${footerFontSize}px` }}>
          <div className={cn({ "font-bold": !!footerLine1Bold })}>{footerLine1}</div>
          <div className={cn({ "font-bold": !!footerLine2Bold })}>{footerLine2}</div>
        </div>

        {fixedFooterText && (
          <>
            {renderDashedLine()}
            <div
              className="text-center mt-1 whitespace-pre-wrap"
              style={{ fontSize: `${footerFontSize ? footerFontSize - 2 : 8}px` }}
            >
              <p className={cn({ "font-bold": !!fixedFooterTextBold })}>{fixedFooterText}</p>
            </div>
          </>
        )}

        {Array.from({ length: blankLinesBottom || 0 }).map((_, i) => (
          <div key={`bottom-${i}`} style={{ height: '10px' }}>&nbsp;</div>
        ))}
      </div>
    );
  }
);

TicketContent.displayName = "TicketContent";
