

import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { RentalPayment, VehicleExpense, OwnerWithdrawal, DailyRentalCharge, Driver, Vehicle } from "@/types";
import { cleanObjectForFirestore } from '../forms';
import { inventoryService } from './inventory.service';
import { startOfDay, differenceInCalendarDays, addDays } from 'date-fns';

// --- Daily Rental Charges ---

const onDailyChargesUpdate = (driverId: string, callback: (charges: DailyRentalCharge[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "dailyRentalCharges"), where("driverId", "==", driverId), orderBy("date", "asc"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyRentalCharge)));
    });
};

const generateMissingCharges = async (driver: Driver, vehicle: Vehicle): Promise<void> => {
    if (!db || !driver.contractDate || !vehicle.dailyRentalCost || vehicle.dailyRentalCost <= 0) return;
    
    const today = startOfDay(new Date());
    const contractStart = startOfDay(new Date(driver.contractDate));

    const chargesRef = collection(db, "dailyRentalCharges");
    const q = query(chargesRef, where("driverId", "==", driver.id), orderBy("date", "desc"), limit(1));
    const lastChargeSnapshot = await getDocs(q);
    
    let lastChargeDate = contractStart;
    if (!lastChargeSnapshot.empty) {
        const lastCharge = lastChargeSnapshot.docs[0].data() as DailyRentalCharge;
        lastChargeDate = addDays(startOfDay(new Date(lastCharge.date)), 1);
    }
    
    if (lastChargeDate > today) return; // Already up to date

    const daysToGenerate = differenceInCalendarDays(today, lastChargeDate) + 1;
    if (daysToGenerate <= 0) return;

    const batch = writeBatch(db);
    for (let i = 0; i < daysToGenerate; i++) {
        const chargeDate = addDays(lastChargeDate, i);
        const newCharge: Omit<DailyRentalCharge, 'id'> = {
            driverId: driver.id,
            vehicleId: vehicle.id,
            date: chargeDate.toISOString(),
            amount: vehicle.dailyRentalCost,
            vehicleLicensePlate: vehicle.licensePlate,
        };
        const docRef = doc(chargesRef);
        batch.set(docRef, newCharge);
    }

    await batch.commit();
};

const saveDailyCharge = async (id: string, data: { date: string; amount: number }): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, 'dailyRentalCharges', id);
    await updateDoc(docRef, data);
};

const deleteDailyCharge = async (id: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await deleteDoc(doc(db, 'dailyRentalCharges', id));
};


// --- Manual Debts (Handled in personnelService) ---
// --- Rental Payments ---

const onRentalPaymentsUpdate = (driverId: string, callback: (payments: RentalPayment[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "rentalPayments"), where("driverId", "==", driverId), orderBy("paymentDate", "asc"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalPayment)));
    });
};

const addRentalPayment = async (
  driver: Driver, 
  vehicle: Vehicle,
  amount: number,
  note?: string,
  paymentDate: Date = new Date()
): Promise<RentalPayment> => {
    if (!db) throw new Error("Database not initialized.");

    const dailyRate = vehicle.dailyRentalCost || 0;
    
    const newPayment: Omit<RentalPayment, 'id'> = {
        driverId: driver.id,
        driverName: driver.name,
        vehicleLicensePlate: vehicle.licensePlate,
        paymentDate: paymentDate.toISOString(),
        amount,
        daysCovered: dailyRate > 0 ? amount / dailyRate : 0,
        note: note || `Pago de renta`,
    };
    
    const docRef = await addDoc(collection(db, 'rentalPayments'), cleanObjectForFirestore(newPayment));
    return { id: docRef.id, ...newPayment };
};

const deleteRentalPayment = async (paymentId: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await deleteDoc(doc(db, "rentalPayments", paymentId));
};


export const rentalService = {
  onDailyChargesUpdate,
  generateMissingCharges,
  saveDailyCharge,
  deleteDailyCharge,
  onRentalPaymentsUpdate,
  addRentalPayment,
  deleteRentalPayment,
};
