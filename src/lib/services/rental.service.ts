// src/lib/services/rental.service.ts

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
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { RentalPayment, DailyRentalCharge, Driver, Vehicle, OwnerWithdrawal, VehicleExpense, PaymentMethod } from "@/types";
import { cleanObjectForFirestore } from '../forms';
import { inventoryService } from './inventory.service';
import { personnelService } from './personnel.service';
import { startOfDay, differenceInCalendarDays, addDays, parseISO, format as formatDate } from 'date-fns';

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
  paymentMethod: PaymentMethod = 'Efectivo',
  paymentId?: string,
): Promise<RentalPayment> => {
    if (!db) throw new Error("Database not initialized.");

    const dailyRate = vehicle.dailyRentalCost || 0;
    
    const authUserString = typeof window !== 'undefined' ? localStorage.getItem('authUser') : null;
    const currentUser = authUserString ? JSON.parse(authUserString) : null;
    
    const paymentData: Omit<RentalPayment, 'id'> = {
        driverId: driver.id,
        driverName: driver.name,
        vehicleLicensePlate: vehicle.licensePlate,
        paymentDate: paymentDate.toISOString(),
        amount,
        paymentMethod,
        daysCovered: dailyRate > 0 ? amount / dailyRate : 0,
        note: note || `Abono de Renta`,
        registeredByName: currentUser?.name || 'Sistema',
    };
    
    if (paymentId) {
        await updateDoc(doc(db, 'rentalPayments', paymentId), cleanObjectForFirestore(paymentData));
        return { id: paymentId, ...paymentData };
    } else {
        const docRef = await addDoc(collection(db, 'rentalPayments'), cleanObjectForFirestore(paymentData));
        return { id: docRef.id, ...paymentData };
    }
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
