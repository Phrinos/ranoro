
'use server';

import type { PublicOwnerReport, VehicleMonthlyReport, WorkshopInfo, Vehicle, RentalPayment, ServiceRecord, VehicleExpense } from '@/types';
import { sanitizeObjectForFirestore } from '@/lib/placeholder-data';
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
  allVehicleExpenses: VehicleExpense[];
  allPublicOwnerReports: PublicOwnerReport[]; // Receive current state from client
}


export async function generateAndShareOwnerReport(
  input: ReportGenerationInput
): Promise<{ success: boolean; report?: PublicOwnerReport; error?: string; }> {
  if (!db) {
    return { success: false, error: 'La base de datos no está configurada.' };
  }
  
  try {
    const { ownerName, forDateISO, workshopInfo, allVehicles, allRentalPayments, allServiceRecords, allVehicleExpenses, allPublicOwnerReports } = input;
    
    const reportDate = new Date();
    const reportForDate = parseISO(forDateISO);
    
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

    // Use the passed-in array to check for an existing report
    const existingReport = allPublicOwnerReports.find(r => r.ownerName === ownerName);
    const publicId = existingReport?.publicId || `rep_${Date.now().toString(36)}`;
    
    const newPublicReport: PublicOwnerReport = {
      publicId,
      ownerName,
      generatedDate: reportDate.toISOString(),
      reportMonth: format(reportForDate, "MMMM 'de' yyyy", { locale: es }),
      detailedReport,
      totalRentalIncome,
      totalMaintenanceCosts,
      totalNetBalance,
      workshopInfo,
    };
    
    // Save the individual public document
    const publicDocRef = doc(db, 'publicOwnerReports', publicId);
    await setDoc(publicDocRef, sanitizeObjectForFirestore(newPublicReport), { merge: true });

    // Update the list of all public reports
    let updatedPublicOwnerReports: PublicOwnerReport[];
    if (existingReport) {
      updatedPublicOwnerReports = allPublicOwnerReports.map(r => r.ownerName === ownerName ? newPublicReport : r);
    } else {
      updatedPublicOwnerReports = [...allPublicOwnerReports, newPublicReport];
    }
    
    // Persist the entire updated list to the main database document
    const mainDbRef = doc(db, 'database/main');
    await setDoc(mainDbRef, { publicOwnerReports: sanitizeObjectForFirestore(updatedPublicOwnerReports) }, { merge: true });

    return { success: true, report: newPublicReport };

  } catch (e) {
    console.error("Error generating public owner report:", e);
    const errorMessage = e instanceof Error ? e.message : 'No se pudo generar el reporte público.';
    return { success: false, error: errorMessage };
  }
}
