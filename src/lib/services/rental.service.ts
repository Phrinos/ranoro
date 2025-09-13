

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
import type { RentalPayment, DailyRentalCharge, Driver, Vehicle, OwnerWithdrawal, VehicleExpense, PaymentMethod } from "@/types";
import { cleanObjectForFirestore } from '../forms';
import { inventoryService } from './inventory.service';
import { personnelService } from './personnel.service';
import { startOfDay, differenceInCalendarDays, addDays, parseISO } from 'date-fns';

// --- Daily Rental Charges ---

const onDailyChargesUpdate = (callback: (charges: DailyRentalCharge[]) => void, driverId?: string): (() => void) => {
    if (!db) return () => {};
    let q;
    if (driverId) {
        q = query(collection(db, "dailyRentalCharges"), where("driverId", "==", driverId), orderBy("date", "desc"));
    } else {
        q = query(collection(db, "dailyRentalCharges"), orderBy("date", "asc"));
    }
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
    
    if (lastChargeDate > today) return;

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

const regenerateAllChargesForAllDrivers = async (): Promise<number> => {
    if (!db) throw new Error("Database not initialized.");
    
    const allDrivers = await personnelService.onDriversUpdatePromise();
    const allVehicles = await inventoryService.onVehiclesUpdatePromise();
    
    const activeDrivers = allDrivers.filter(d => !d.isArchived && d.assignedVehicleId && d.contractDate);
    const fleetVehicles = allVehicles.filter(v => v.isFleetVehicle);

    const batch = writeBatch(db);
    const chargesRef = collection(db, "dailyRentalCharges");
    let chargesCount = 0;

    for (const driver of activeDrivers) {
        const vehicle = fleetVehicles.find(v => v.id === driver.assignedVehicleId);
        if (!vehicle || !vehicle.dailyRentalCost || vehicle.dailyRentalCost <= 0) continue;

        const today = startOfDay(new Date());
        const contractStart = startOfDay(parseISO(driver.contractDate!));

        const daysToGenerate = differenceInCalendarDays(today, contractStart) + 1;
        if (daysToGenerate <= 0) continue;

        for (let i = 0; i < daysToGenerate; i++) {
            const chargeDate = addDays(contractStart, i);
            const newCharge: Omit<DailyRentalCharge, 'id'> = {
                driverId: driver.id,
                vehicleId: vehicle.id,
                date: chargeDate.toISOString(),
                amount: vehicle.dailyRentalCost,
                vehicleLicensePlate: vehicle.licensePlate,
            };
            const docRef = doc(chargesRef);
            batch.set(docRef, newCharge);
            chargesCount++;
        }
    }

    await batch.commit();
    return chargesCount;
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


// --- Rental Payments ---

const onRentalPaymentsUpdate = (callback: (payments: RentalPayment[]) => void, driverId?: string): (() => void) => {
    if (!db) return () => {};
    let q;
    if (driverId) {
        q = query(collection(db, "rentalPayments"), where("driverId", "==", driverId), orderBy("paymentDate", "asc"));
    } else {
        q = query(collection(db, "rentalPayments"), orderBy("paymentDate", "asc"));
    }
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalPayment)));
    });
};

const addRentalPayment = async (
  driver: Driver, 
  vehicle: Vehicle,
  amount: number,
  note?: string,
  paymentDate: Date = new Date(),
  paymentMethod: PaymentMethod = 'Efectivo'
): Promise<RentalPayment> => {
    if (!db) throw new Error("Database not initialized.");

    const dailyRate = vehicle.dailyRentalCost || 0;
    
    const newPayment: Omit<RentalPayment, 'id'> = {
        driverId: driver.id,
        driverName: driver.name,
        vehicleLicensePlate: vehicle.licensePlate,
        paymentDate: paymentDate.toISOString(),
        amount,
        paymentMethod,
        daysCovered: dailyRate > 0 ? amount / dailyRate : 0,
        note: note || `Abono de Renta`,
    };
    
    const docRef = await addDoc(collection(db, 'rentalPayments'), cleanObjectForFirestore(newPayment));
    return { id: docRef.id, ...newPayment };
};


const deleteRentalPayment = async (paymentId: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await deleteDoc(doc(db, "rentalPayments", paymentId));
};

// --- Owner Withdrawals ---
const onOwnerWithdrawalsUpdate = (callback: (withdrawals: OwnerWithdrawal[]) => void): (() => void) => {
    if (!db) return () => {};
    return onSnapshot(query(collection(db, "ownerWithdrawals"), orderBy("date", "desc")), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OwnerWithdrawal)));
    });
};

const addOwnerWithdrawal = async (data: Omit<OwnerWithdrawal, 'id' | 'date'>): Promise<OwnerWithdrawal> => {
    const newWithdrawal = { ...data, date: new Date().toISOString() };
    const docRef = await addDoc(collection(db, 'ownerWithdrawals'), cleanObjectForFirestore(newWithdrawal));
    return { id: docRef.id, ...newWithdrawal };
};

// --- Vehicle Expenses ---
const onVehicleExpensesUpdate = (callback: (expenses: VehicleExpense[]) => void): (() => void) => {
    if (!db) return () => {};
    return onSnapshot(query(collection(db, "vehicleExpenses"), orderBy("date", "desc")), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleExpense)));
    });
};

const addVehicleExpense = async (data: Omit<VehicleExpense, 'id' | 'date' | 'vehicleLicensePlate'>): Promise<VehicleExpense> => {
    const vehicle = await inventoryService.getVehicleById(data.vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    const newExpense = { ...data, date: new Date().toISOString(), vehicleLicensePlate: vehicle.licensePlate };
    const docRef = await addDoc(collection(db, 'vehicleExpenses'), cleanObjectForFirestore(newExpense));
    return { id: docRef.id, ...newExpense };
};


export const rentalService = {
  onDailyChargesUpdate,
  generateMissingCharges,
  regenerateAllChargesForAllDrivers,
  saveDailyCharge,
  deleteDailyCharge,
  onRentalPaymentsUpdate,
  addRentalPayment,
  deleteRentalPayment,
  onOwnerWithdrawalsUpdate,
  addOwnerWithdrawal,
  onVehicleExpensesUpdate,
  addVehicleExpense,
};
