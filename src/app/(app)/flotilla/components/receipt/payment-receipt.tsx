// src/app/(app)/flotilla/components/receipt/payment-receipt.tsx
"use client";

import React, { useEffect, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import Image from "next/image";
import { cn, formatCurrency, capitalizeWords } from "@/lib/utils";
import type { RentalPayment, Driver, Vehicle } from "@/types";

type Branding = {
  name?: string;
  phone?: string;
  logoUrl?: string;
  logoWidth?: number;
  nameBold?: boolean;
  footerLine1?: string;
  footerLine1Bold?: boolean;
  headerFontSize?: number;
  bodyFontSize?: number;
  itemsFontSize?: number;
  totalsFontSize?: number;
  footerFontSize?: number;
};

const DEFAULT_BRANDING: Branding = {
  name: "RANORO",
  phone: "4491425323",
  logoUrl: "/ranoro-logo.png",
  logoWidth: 120,
};

function safeDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isValid(val) ? val : null;
  if (typeof val === "string") {
    try { const d = parseISO(val); return isValid(d) ? d : null; } catch { return null; }
  }
  if (val?.seconds) { const d = new Date(val.seconds * 1000); return isValid(d) ? d : null; }
  return null;
}

export interface PaymentReceiptProps {
  payment: RentalPayment;
  driver?: Driver;
  vehicle?: Vehicle;
  /** Month balance (negative = adeudo) */
  driverBalance: number;
  /** Total paid this month */
  totalPaidThisMonth?: number;
  /** Total charges this month */
  totalChargesThisMonth?: number;
  /** Daily rate — passed directly (most reliable) */
  dailyRate?: number;
  currentMonthLabel?: string;
  previewBranding?: Branding;
}

export const PaymentReceipt = React.forwardRef<HTMLDivElement, PaymentReceiptProps>(
  ({ payment, driver, vehicle, driverBalance, totalPaidThisMonth, totalChargesThisMonth, dailyRate: dailyRateProp, currentMonthLabel, previewBranding }, ref) => {
    const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);

    useEffect(() => {
      const base = previewBranding ?? DEFAULT_BRANDING;
      try {
        const stored = localStorage.getItem("workshopTicketInfo");
        if (stored) setBranding({ ...base, ...JSON.parse(stored) });
        else setBranding(base);
      } catch { setBranding(base); }
    }, [previewBranding]);

    // registeredAt = the moment the payment was saved (never changes on reprint)
    const registeredAt = safeDate((payment as any).registeredAt) ?? safeDate(payment.paymentDate) ?? new Date();
    const emissionStr = format(registeredAt, "dd/MM/yyyy HH:mm", { locale: es });

    const paymentDate = safeDate(payment.paymentDate) ?? new Date();
    const paymentDateStr = format(paymentDate, "dd 'de' MMMM, yyyy", { locale: es });

    const monthLabel = currentMonthLabel ?? capitalizeWords(format(paymentDate, "MMMM yyyy", { locale: es }));

    const dailyRate = dailyRateProp ?? vehicle?.dailyRentalCost ?? (payment as any).dailyRate ?? 0;
    const daysCovered = dailyRate > 0 && totalChargesThisMonth
      ? Math.round(totalChargesThisMonth / dailyRate)
      : 0;
    const totalForMonth = totalChargesThisMonth ?? 0;

    const hf = `${branding.headerFontSize || 10}px`;
    const bf = `${branding.bodyFontSize || 10}px`;
    const itf = `${branding.itemsFontSize || 10}px`;
    const tf = `${branding.totalsFontSize || 12}px`;
    const ff = `${branding.footerFontSize || 10}px`;

    return (
      <div
        ref={ref}
        data-format="receipt"
        className="font-mono bg-white text-black p-2"
        style={{ width: "302px", minWidth: "302px", maxWidth: "302px" }}
      >
        {/* Header */}
        <div className="text-center mb-1 leading-tight">
          {branding.logoUrl && (
            <div className="mx-auto mb-1 relative" style={{ width: `${branding.logoWidth || 120}px`, height: `${(branding.logoWidth || 120) / 3}px` }}>
              <Image src={branding.logoUrl} alt="Logo" fill style={{ objectFit: "contain" }} crossOrigin="anonymous" unoptimized />
            </div>
          )}
          <div style={{ fontSize: hf }}>
            <p className={cn({ "font-bold": branding.nameBold })}>{branding.name}</p>
            {branding.phone && <p>Tel: {branding.phone}</p>}
          </div>
        </div>

        <div className="border-t border-dashed border-neutral-400 my-1" />

        <div style={{ fontSize: bf }}>
          <div>Fecha Emisión: {emissionStr}</div>
          <div>Folio: #{payment.id?.slice(-6)}</div>
          {payment.registeredByName && <div>Recibió: {payment.registeredByName}</div>}
        </div>

        <div className="border-t border-dashed border-neutral-400 my-1" />
        <div className="font-semibold text-center" style={{ fontSize: bf }}>
          RECIBO DE PAGO — {monthLabel}
        </div>
        <div className="border-t border-dashed border-neutral-400 my-1" />

        <table className="w-full text-left" style={{ fontSize: itf }}>
          <tbody>
            <tr>
              <td className="pr-2 font-semibold">Recibimos de:</td>
              <td>{driver?.name || payment.driverName}</td>
            </tr>
            <tr>
              <td className="pr-2 font-semibold">Vehículo:</td>
              <td>{vehicle ? `${vehicle.make} ${vehicle.model}` : ""} ({payment.vehicleLicensePlate})</td>
            </tr>
            <tr><td colSpan={2}><div className="border-t border-dashed border-neutral-400 my-1" /></td></tr>
            <tr>
              <td className="pr-2 font-semibold">Fecha del Pago:</td>
              <td>{paymentDateStr}</td>
            </tr>
            <tr>
              <td className="pr-2 font-semibold">Método:</td>
              <td>{payment.paymentMethod || "Efectivo"}</td>
            </tr>
            <tr>
              <td className="pr-2 font-semibold">Concepto:</td>
              <td>{payment.note || "Abono de Renta"}</td>
            </tr>
            <tr><td colSpan={2}><div className="border-t border-dashed border-neutral-400 my-1" /></td></tr>
          </tbody>
        </table>

        {/* Big amount */}
        <table className="w-full" style={{ fontSize: tf }}>
          <tbody>
            <tr className="font-black text-2xl">
              <td>Abono:</td>
              <td className="text-right">{formatCurrency(payment.amount)}</td>
            </tr>
          </tbody>
        </table>

        <div className="border-t border-dashed border-neutral-400 my-1" />
        <div className="font-semibold text-center" style={{ fontSize: bf }}>RESUMEN DEL MES</div>

        <table className="w-full" style={{ fontSize: itf }}>
          <tbody>
            {dailyRate > 0 && (
              <>
                <tr>
                  <td>Renta diaria:</td>
                  <td className="text-right">{formatCurrency(dailyRate)}</td>
                </tr>
                <tr>
                  <td>Días generados:</td>
                  <td className="text-right">{daysCovered} días</td>
                </tr>
                <tr>
                  <td className="font-semibold">Total del mes:</td>
                  <td className="text-right font-semibold">{formatCurrency(totalForMonth)}</td>
                </tr>
                <tr><td colSpan={2}><div className="border-t border-dashed border-neutral-400 my-1" /></td></tr>
              </>
            )}
            {totalPaidThisMonth !== undefined && (
              <tr>
                <td>Total pagado:</td>
                <td className="text-right">{formatCurrency(totalPaidThisMonth)}</td>
              </tr>
            )}
            <tr className={cn("font-bold text-base", driverBalance >= 0 ? "text-green-700" : "text-red-700")}>
              <td>{driverBalance >= 0 ? "Saldo a favor:" : "Adeudo del mes:"}</td>
              <td className="text-right">{formatCurrency(Math.abs(driverBalance))}</td>
            </tr>
          </tbody>
        </table>

        <div className="border-t border-dashed border-neutral-400 my-1" />
        {branding.footerLine1 && (
          <div className="text-center mt-1" style={{ fontSize: ff }}>
            <p className={cn({ "font-bold": branding.footerLine1Bold })}>{branding.footerLine1}</p>
          </div>
        )}
      </div>
    );
  }
);

PaymentReceipt.displayName = "PaymentReceipt";
