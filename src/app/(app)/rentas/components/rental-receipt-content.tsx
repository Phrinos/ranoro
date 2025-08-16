

"use client";

import type { RentalPayment, WorkshopInfo, Driver, Vehicle } from '@/types';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isAfter, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useMemo } from 'react';
import Image from "next/image";
import { calculateDriverDebt, formatCurrency } from "@/lib/utils";
import { AlertTriangle, Wallet, CreditCard, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';


const initialWorkshopInfo: WorkshopInfo = {
  name: "RANORO",
  phone: "4491425323",
  addressLine1: "Av. de la Convencion de 1914 No. 1421",
  logoUrl: "/ranoro-logo.png",
};

const paymentMethodIcons: Record<RentalPayment['paymentMethod'], React.ElementType> = {
  "Efectivo": Wallet,
  "Tarjeta": CreditCard,
  "Transferencia": Landmark,
};


interface RentalReceiptContentProps {
  payment: RentalPayment;
  driver?: Driver;
  allPaymentsForDriver?: RentalPayment[];
  vehicle?: Vehicle;
  workshopInfo?: Partial<WorkshopInfo>;
}

export const RentalReceiptContent = React.forwardRef<HTMLDivElement, RentalReceiptContentProps>(
  ({ payment, driver, allPaymentsForDriver, vehicle, workshopInfo: customWorkshopInfo }, ref) => {
    const workshopInfo = { ...initialWorkshopInfo, ...customWorkshopInfo };

    const formattedDateTime = format(parseISO(payment.paymentDate), "dd/MM/yyyy HH:mm:ss", { locale: es });
    const formattedAmount = `$${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const debtInfo = useMemo(() => {
        if (!driver || !allPaymentsForDriver || !vehicle) return { totalDebt: 0, rentalDebt: 0, depositDebt: 0, manualDebt: 0, balance: 0 };
        return calculateDriverDebt(driver, allPaymentsForDriver, [vehicle]);
    }, [driver, allPaymentsForDriver, vehicle]);
    
    const monthlyBalance = useMemo(() => {
        if (!driver || !allPaymentsForDriver || !vehicle?.dailyRentalCost) return 0;
        
        const today = new Date();
        const monthStart = startOfMonth(today);

        const paymentsThisMonth = allPaymentsForDriver
            .filter(p => isWithinInterval(parseISO(p.paymentDate), { start: monthStart, end: today }))
            .reduce((sum, p) => sum + p.amount, 0);

        const contractStartDate = driver.contractDate ? parseISO(driver.contractDate) : today;
        const calculationStartDate = isAfter(contractStartDate, monthStart) ? contractStartDate : monthStart;
        
        const daysToChargeThisMonth = !isAfter(calculationStartDate, today) ? differenceInCalendarDays(today, calculationStartDate) + 1 : 0;
        const chargesThisMonth = (vehicle.dailyRentalCost || 0) * daysToChargeThisMonth;

        return paymentsThisMonth - chargesThisMonth;
    }, [driver, allPaymentsForDriver, vehicle]);

    const monthlyPayments = useMemo(() => {
      if (!allPaymentsForDriver) return { total: 0, days: 0 };
      const monthStart = startOfMonth(new Date());
      const monthEnd = endOfMonth(new Date());

      const paymentsThisMonth = allPaymentsForDriver.filter(p => isWithinInterval(parseISO(p.paymentDate), { start: monthStart, end: monthEnd }));
      const total = paymentsThisMonth.reduce((sum, p) => sum + p.amount, 0);
      const days = paymentsThisMonth.reduce((sum, p) => sum + p.daysCovered, 0);
      
      return { total, days };

    }, [allPaymentsForDriver]);
    
    const PaymentIcon = payment.paymentMethod ? paymentMethodIcons[payment.paymentMethod] : Wallet;

    return (
      <div 
        ref={ref}
        data-format="receipt"
        className="font-mono bg-white text-black px-2 py-4 max-w-[300px] mx-auto text-[10px] leading-tight print:max-w-full print:text-[9px] print:p-0"
      >
        <div className="text-center mb-2">
           {workshopInfo.logoUrl && (
            <div className="mx-auto mb-1 relative" style={{ width: `${workshopInfo.logoWidth || 120}px`, height: `${(workshopInfo.logoWidth || 120) / 3}px`}}>
                <Image 
                    src={workshopInfo.logoUrl} 
                    alt="Logo" 
                    fill
                    style={{ objectFit: 'contain' }}
                    crossOrigin="anonymous"
                    data-ai-hint="workshop logo"
                    unoptimized
                />
            </div>
          )}
          <p>{workshopInfo.addressLine1}</p>
          <p>Tel: {workshopInfo.phone}</p>
        </div>

        <div className="border-t border-dashed border-neutral-400 mt-2 mb-1"></div>

        <div className="flex justify-between">
          <span>Fecha:</span>
          <span>{formattedDateTime}</span>
        </div>
        <div className="flex justify-between">
          <span>Folio:</span>
          <span>{payment.id}</span>
        </div>
        <div className="flex justify-between">
          <span>Asesor:</span>
          <span>{payment.registeredBy}</span>
        </div>
        
        <div className="border-t border-dashed border-neutral-400 mt-1 mb-2"></div>

        <div className="text-center font-bold my-2">RECIBO DE PAGO DE RENTA</div>

        <div className="space-y-1">
            <div className="flex justify-between"><span>Conductor:</span><span className="font-semibold">{payment.driverName}</span></div>
            <div className="flex justify-between"><span>Vehículo:</span><span className="font-semibold">{payment.vehicleLicensePlate}</span></div>
            {payment.note && <div className="text-left"><span>Concepto:</span><span className="font-semibold block">{payment.note}</span></div>}
            <div className="flex justify-between items-center text-lg">
              <span>TOTAL PAGADO:</span>
              <div className="flex items-center gap-2">
                {payment.paymentMethod && <PaymentIcon className="h-4 w-4" />}
                <span className="font-bold">{formattedAmount}</span>
              </div>
            </div>
        </div>
        
        <div className="my-2 p-2 border border-blue-500 bg-blue-50 text-blue-800">
            <h4 className="font-bold">Estado de Cuenta</h4>
            <div className="space-y-0.5 text-xs mt-1">
                {debtInfo.rentalDebt > 0 && <div className="flex justify-between"><span>Deuda por Renta:</span><span>{formatCurrency(debtInfo.rentalDebt)}</span></div>}
                {debtInfo.depositDebt > 0 && <div className="flex justify-between"><span>Deuda de Depósito:</span><span>{formatCurrency(debtInfo.depositDebt)}</span></div>}
                {debtInfo.manualDebt > 0 && <div className="flex justify-between"><span>Adeudos Manuales:</span><span>{formatCurrency(debtInfo.manualDebt)}</span></div>}
                {debtInfo.balance > 0 && <div className="flex justify-between"><span>Saldo a Favor:</span><span>{formatCurrency(debtInfo.balance)}</span></div>}
                <div className="flex justify-between font-bold mt-1 pt-1 border-t">
                    <span className={debtInfo.totalDebt > 0 ? "text-red-700" : ""}>Deuda Total:</span>
                    <span className={debtInfo.totalDebt > 0 ? "text-red-700" : ""}>{formatCurrency(debtInfo.totalDebt)}</span>
                </div>
                 <div className="flex justify-between font-bold mt-1 pt-1 border-t border-blue-300">
                    <span className={monthlyBalance < 0 ? "text-red-700" : "text-green-700"}>Balance del Mes:</span>
                    <span className={monthlyBalance < 0 ? "text-red-700" : "text-green-700"}>{formatCurrency(monthlyBalance)}</span>
                </div>
            </div>
        </div>

        <div className="border-t border-dashed border-neutral-400 mt-2 mb-1"></div>

        <p className="text-center mt-4">¡Gracias por su pago!</p>
      </div>
    );
  }
);

RentalReceiptContent.displayName = "RentalReceiptContent";
