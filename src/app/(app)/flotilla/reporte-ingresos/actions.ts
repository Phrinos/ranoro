// This server action is no longer used by the page component.
// The calculation logic has been moved to the client-side `page.tsx`.
// This file can be removed in a future cleanup if no other components use it.

'use server';

import type { PublicOwnerReport, VehicleMonthlyReport, WorkshopInfo, Vehicle, RentalPayment, ServiceRecord, VehicleExpense } from '@/types';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ReportGenerationInput {
  ownerName: string;
  forDateISO: string;
  workshopInfo?: WorkshopInfo;
  allVehicles: Vehicle[];
  allRentalPayments: RentalPayment[];
  allServiceRecords: ServiceRecord[];
  allVehicleExpenses: VehicleExpense[];
}

export async function generateOwnerReportData(
  input: ReportGenerationInput
): Promise<{ success: boolean; report?: PublicOwnerReport; error?: string; }> {
  try {
    const { ownerName, forDateISO, workshopInfo, allVehicles, allRentalPayments, allServiceRecords, allVehicleExpenses } = input;
    
    const reportDate = new Date();
    const reportForDate = parseISO(forDateISO);
    const reportMonth = format(reportForDate, "MMMM 'de' yyyy", { locale: es });
    
    const monthStart = startOfMonth(reportForDate);
    const monthEnd = endOfMonth(reportForDate);
    
    const ownerVehicles = allVehicles.filter(v => v.isFleetVehicle && v.ownerName === ownerName);

    const detailedReport: VehicleMonthlyReport[] = ownerVehicles.map(vehicle => {
      const vehiclePayments = allRentalPayments.filter(p => {
        const pDate = parseISO(p.paymentDate);
        return p.vehicleLicensePlate === vehicle.licensePlate && isValid(pDate) && isWithinInterval(pDate, { start: monthStart, end: monthEnd });
      });

      const rentalIncome = vehiclePayments.reduce((sum, p) => sum + p.amount, 0);
      const daysRented = vehiclePayments.reduce((sum, p) => sum + p.daysCovered, 0);

      const vehicleServices = allServiceRecords.filter(s => {
        const sDate = parseISO(s.serviceDate);
        return s.vehicleId === vehicle.id && isValid(sDate) && isWithinInterval(sDate, { start: monthStart, end: monthEnd });
      });
      const maintenanceCostsFromServices = vehicleServices.reduce((sum, s) => sum + s.totalCost, 0);
      
      const vehicleExpensesInMonth = allVehicleExpenses.filter(e => {
        const eDate = parseISO(e.date);
        return e.vehicleId === vehicle.id && isValid(eDate) && isWithinInterval(eDate, { start: monthStart, end: monthEnd });
      });
      const costsFromVehicleExpenses = vehicleExpensesInMonth.reduce((sum, e) => sum + e.amount, 0);

      const totalMaintenanceCosts = maintenanceCostsFromServices + costsFromVehicleExpenses;
      const totalDeductions = (vehicle.gpsMonthlyCost || 0) + (vehicle.adminMonthlyCost || 0) + (vehicle.insuranceMonthlyCost || 0);
      const finalCostsAndDeductions = totalMaintenanceCosts + totalDeductions;

      return {
        vehicleId: vehicle.id,
        vehicleInfo: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
        daysRented,
        rentalIncome,
        maintenanceCosts: finalCostsAndDeductions,
      };
    });

    const totalRentalIncome = detailedReport.reduce((sum, r) => sum + r.rentalIncome, 0);
    const totalMaintenanceCosts = detailedReport.reduce((sum, r) => sum + r.maintenanceCosts, 0);
    const totalNetBalance = totalRentalIncome - totalMaintenanceCosts;

    const safeOwnerName = ownerName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const monthId = format(reportForDate, "yyyy-MM");
    const publicId = `${safeOwnerName}-${monthId}`;
    
    const publicReportObject: PublicOwnerReport = {
      publicId,
      ownerName,
      generatedDate: reportDate.toISOString(),
      reportMonth,
      detailedReport,
      totalRentalIncome,
      totalMaintenanceCosts,
      totalNetBalance,
      workshopInfo,
    };
    
    return { success: true, report: publicReportObject };

  } catch (e) {
    console.error("Error generating owner report data:", e);
    const errorMessage = e instanceof Error ? e.message : 'No se pudo generar el reporte.';
    return { success: false, error: errorMessage };
  }
}
