// src/app/(app)/flotilla/caja/components/RentalPaymentTicket.tsx
"use client";

import type { RentalPayment, Driver, Vehicle } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import { cn, formatCurrency } from "@/lib/utils";
import Image from 'next/image';

const initialWorkshopInfo: any = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  logoUrl: "/ranoro-logo.png",
};

interface RentalPaymentTicketProps {
  payment: RentalPayment;
  driver?: Driver;
  vehicle?: Vehicle;
  driverBalance: number;
}

export const RentalPaymentTicket = React.forwardRef<HTMLDivElement, RentalPaymentTicketProps>(
  ({ payment, driver, vehicle, driverBalance }, ref) => {
    
    const [workshopInfo, setWorkshopInfo] = useState<any>(initialWorkshopInfo);

    useEffect(() => {
        const stored = localStorage.getItem('workshopTicketInfo');
        if (stored) {
            try {
                setWorkshopInfo({ ...initialWorkshopInfo, ...JSON.parse(stored) });
            } catch (e) {
                console.error("Failed to parse workshop info", e);
            }
        }
    }, []);

    const formattedDateTime = format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: es });
    const paymentDate = payment.paymentDate ? parseISO(payment.paymentDate) : new Date();
    const formattedPaymentDate = isValid(paymentDate) ? format(paymentDate, "dd 'de' MMMM, yyyy", { locale: es }) : 'N/A';
    
    return (
      <div 
        ref={ref}
        data-format="receipt"
        className="font-mono bg-white text-black p-4 max-w-[300px] mx-auto print-format-receipt"
      >
        <div className="text-center mb-1 space-y-0 leading-tight">
          {workshopInfo.logoUrl && (
            <div className="mx-auto mb-1 relative" style={{ width: `${workshopInfo.logoWidth || 120}px`, height: `${(workshopInfo.logoWidth || 120) / 3}px` }}>
                <Image 
                  src={workshopInfo.logoUrl} 
                  alt="Logo" 
                  fill
                  style={{ objectFit: 'contain' }}
                  crossOrigin="anonymous"
                  unoptimized
                />
            </div>
          )}
          <div style={{ fontSize: `${workshopInfo.headerFontSize || 10}px` }}>
              <p className={cn({"font-bold": workshopInfo.nameBold})}>{workshopInfo.name}</p>
              <p>Tel: {workshopInfo.phone}</p>
          </div>
        </div>

        <div className="border-t border-dashed border-neutral-400 mt-2 mb-1"></div>
        
        <div style={{ fontSize: `${workshopInfo.bodyFontSize || 10}px` }}>
            <div>Fecha Emisión: {formattedDateTime}</div>
            <div>Folio de Pago: {payment.id}</div>
            {payment.registeredByName && <div>Recibió: {payment.registeredByName}</div>}
        </div>
        
        <div className="border-t border-dashed border-neutral-400 mt-2 mb-1"></div>
        <div className="font-semibold text-center my-1" style={{ fontSize: `${workshopInfo.bodyFontSize || 10}px` }}>RECIBO DE PAGO</div>
        <div className="border-t border-dashed border-neutral-400 mt-1 mb-2"></div>

        <table className="w-full text-left" style={{ fontSize: `${workshopInfo.itemsFontSize || 10}px` }}>
            <tbody>
                <tr><td className="pr-2"><span className="font-semibold">Recibimos de:</span></td><td>{driver?.name || payment.driverName}</td></tr>
                <tr><td className="pr-2"><span className="font-semibold">Vehículo:</span></td><td>{vehicle?.make} {vehicle?.model} ({payment.vehicleLicensePlate})</td></tr>
                <tr><td colSpan={2}><div className="border-t border-dashed border-neutral-400 my-2"></div></td></tr>
                <tr><td className="pr-2"><span className="font-semibold">Fecha del Pago:</span></td><td>{formattedPaymentDate}</td></tr>
                <tr><td className="pr-2"><span className="font-semibold">Método de Pago:</span></td><td>{payment.paymentMethod || 'Efectivo'}</td></tr>
                <tr><td className="pr-2"><span className="font-semibold">Descripción:</span></td><td>{payment.note || 'Abono de Renta'}</td></tr>
                 <tr><td colSpan={2}><div className="border-t border-dashed border-neutral-400 my-2"></div></td></tr>
            </tbody>
        </table>


        <table className="w-full mt-2" style={{ fontSize: `${workshopInfo.totalsFontSize || 12}px` }}>
            <tbody>
                <tr className="font-bold text-lg">
                    <td className="text-left">Total Pagado:</td>
                    <td className="text-right">{formatCurrency(payment.amount)}</td>
                </tr>
                 <tr className={cn("font-semibold text-base", driverBalance >= 0 ? 'text-green-700' : 'text-red-700')}>
                    <td className="text-left">Saldo Global:</td>
                    <td className="text-right">{formatCurrency(driverBalance)}</td>
                </tr>
            </tbody>
        </table>
        
        <div className="border-t border-dashed border-neutral-400 mt-2 mb-1"></div>

        <div className="text-center mt-2" style={{ fontSize: `${workshopInfo.footerFontSize || 10}px` }}>
            <p className={cn({ "font-bold": workshopInfo.footerLine1Bold })}>{workshopInfo.footerLine1}</p>
        </div>
      </div>
    );
  }
);

RentalPaymentTicket.displayName = "RentalPaymentTicket";
