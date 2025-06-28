
'use server';

import {
  placeholderPublicOwnerReports,
  persistToFirestore,
  sanitizeObjectForFirestore,
} from '@/lib/placeholder-data';
import type { PublicOwnerReport, VehicleMonthlyReport, WorkshopInfo, Vehicle, RentalPayment, ServiceRecord } from '@/types';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '@root/lib/firebaseClient.js';
import { doc, setDoc } from 'firebase/firestore';


export interface ReportGenerationInput {
  ownerName: string;
  forDateISO: string;
  workshopInfo?: WorkshopInfo;
  allVehicles: Vehicle[];
  allRentalPayments: RentalPayment[];
  allServiceRecords: ServiceRecord[];
}


export async function generateAndShareOwnerReport(
  input: ReportGenerationInput
): Promise<{ success: boolean; report?: PublicOwnerReport; error?: string; }> {
  if (!db) {
    return { success: false, error: 'La base de datos no está configurada.' };
  }
  
  try {
    const { ownerName, forDateISO, workshopInfo, allVehicles, allRentalPayments, allServiceRecords } = input;
    
    const reportDate = new Date(); // Generation date
    const reportForDate = parseISO(forDateISO); // Date the report is about
    
    const monthStart = startOfMonth(reportForDate);
    const monthEnd = endOfMonth(reportForDate);
    
    // --- Perform Calculations ---
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
      const maintenanceCosts = vehicleServices.reduce((sum, s) => sum + s.totalCost, 0);

      return {
        vehicleId: vehicle.id,
        vehicleInfo: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
        daysRented,
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
    
    const publicId = existingReport?.publicId || `rep_${Date.now().toString(36)}`;
    
    const newPublicReport: PublicOwnerReport = {
      publicId,
      ownerName,
      generatedDate: new Date().toISOString(),
      reportMonth: format(reportForDate, "MMMM 'de' yyyy", { locale: es }),
      detailedReport,
      totalRentalIncome,
      totalMaintenanceCosts,
      totalNetBalance,
      workshopInfo,
    };
    
    const publicDocRef = doc(db, 'publicOwnerReports', publicId);
    await setDoc(publicDocRef, sanitizeObjectForFirestore(newPublicReport), { merge: true });

    // Update the local placeholder cache as well
    if (existingReport) {
      Object.assign(existingReport, newPublicReport);
    } else {
      placeholderPublicOwnerReports.push(newPublicReport);
    }
    await persistToFirestore(['publicOwnerReports']); // This keeps the private master doc in sync

    return { success: true, report: newPublicReport };

  } catch (e) {
    console.error("Error generating public owner report:", e);
    return { success: false, error: 'No se pudo generar el reporte público.' };
  }
}
