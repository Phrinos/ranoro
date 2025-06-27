
'use server';

import {
  placeholderVehicles,
  placeholderRentalPayments,
  placeholderServiceRecords,
  placeholderPublicOwnerReports,
  persistToFirestore
} from '@/lib/placeholder-data';
import type { PublicOwnerReport, VehicleMonthlyReport, WorkshopInfo } from '@/types';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

export async function generateAndShareOwnerReport(
  ownerName: string, 
  forDateISO: string, // New parameter
  workshopInfo?: WorkshopInfo
): Promise<{ success: boolean; report?: PublicOwnerReport; error?: string; }> {
  try {
    const reportDate = new Date(); // Generation date
    const reportForDate = parseISO(forDateISO); // Date the report is about
    
    const monthStart = startOfMonth(reportForDate);
    const monthEnd = endOfMonth(reportForDate);
    
    // --- Perform Calculations ---
    const ownerVehicles = placeholderVehicles.filter(v => v.isFleetVehicle && v.ownerName === ownerName);

    const detailedReport: VehicleMonthlyReport[] = ownerVehicles.map(vehicle => {
      const vehiclePayments = placeholderRentalPayments.filter(p => {
        const pDate = parseISO(p.paymentDate);
        return p.vehicleLicensePlate === vehicle.licensePlate && isValid(pDate) && isWithinInterval(pDate, { start: monthStart, end: monthEnd });
      });

      const rentalIncome = vehiclePayments.reduce((sum, p) => sum + p.amount, 0);

      const vehicleServices = placeholderServiceRecords.filter(s => {
        const sDate = parseISO(s.serviceDate);
        return s.vehicleId === vehicle.id && isValid(sDate) && isWithinInterval(sDate, { start: monthStart, end: monthEnd });
      });
      const maintenanceCosts = vehicleServices.reduce((sum, s) => sum + s.totalCost, 0);

      return {
        vehicleId: vehicle.id,
        vehicleInfo: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
        daysRented: vehiclePayments.length,
        rentalIncome,
        maintenanceCosts,
      };
    });

    const totalRentalIncome = detailedReport.reduce((sum, r) => sum + r.rentalIncome, 0);
    const totalMaintenanceCosts = detailedReport.reduce((sum, r) => sum + r.maintenanceCosts, 0);
    const totalNetBalance = totalRentalIncome - totalMaintenanceCosts;

    // --- Check for existing report and Create/Update ---
    // The logic is to have one single public document per owner that gets updated.
    let existingReport = placeholderPublicOwnerReports.find(r => r.ownerName === ownerName);
    
    const reportData = {
        ownerName,
        generatedDate: reportDate.toISOString(),
        reportMonth: format(reportForDate, "MMMM 'de' yyyy", { locale: es }),
        detailedReport,
        totalRentalIncome,
        totalMaintenanceCosts,
        totalNetBalance,
        workshopInfo,
    };

    if (existingReport) {
      // Update existing report
      Object.assign(existingReport, reportData);
      await persistToFirestore(['publicOwnerReports']);
      return { success: true, report: existingReport };
    } else {
      // Create new report
      const publicId = `rep_${Date.now().toString(36)}`;
      const newPublicReport: PublicOwnerReport = {
        ...reportData,
        publicId,
      };
      placeholderPublicOwnerReports.push(newPublicReport);
      await persistToFirestore(['publicOwnerReports']);
      return { success: true, report: newPublicReport };
    }

  } catch (e) {
    console.error("Error generating public owner report:", e);
    return { success: false, error: 'No se pudo generar el reporte público.' };
  }
}
