// src/lib/services/rental.service.ts

import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { RentalPayment, DailyRentalCharge, Driver, Vehicle, OwnerWithdrawal, VehicleExpense, PaymentMethod } from "@/types";
import { cleanObjectForFirestore } from '../forms';
import { cashService } from './cash.service';
import { inventoryService } from './inventory.service';

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

const saveDailyCharge = async (id: string, data: { date: string; amount: number; note: string }): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, 'dailyRentalCharges', id);
    await updateDoc(docRef, data as any);
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
  paymentDateParam?: Date | string,
  paymentMethod?: PaymentMethod,
  paymentId?: string,
): Promise<RentalPayment> => {
    if (!db) throw new Error("Database not initialized.");

    const paymentDate = paymentDateParam ? (paymentDateParam instanceof Date ? paymentDateParam : new Date(paymentDateParam)) : new Date();
    const paymentDateIso = paymentDate.toISOString();

    const dailyRate = vehicle.dailyRentalCost || 0;
    
    const authUserString = typeof window !== 'undefined' ? localStorage.getItem('authUser') : null;
    const currentUser = authUserString ? JSON.parse(authUserString) : null;
    
    const rawPaymentData = {
        driverId: String(driver.id),
        driverName: driver.name,
        vehicleLicensePlate: vehicle.licensePlate,
        paymentDate: paymentDateIso,
        amount: Number(amount) || 0,
        daysCovered: dailyRate > 0 ? (Number(amount) || 0) / dailyRate : 0,
        note: note || "Abono de Renta",
        paymentMethod,
        registeredByName: currentUser?.name || 'Sistema',
        date: paymentDateIso,
    };
    
    const paymentDataForDb = cleanObjectForFirestore(rawPaymentData);

    let savedPaymentId: string;
    
    if (paymentId) {
        await updateDoc(doc(db, 'rentalPayments', paymentId), paymentDataForDb as any);
        savedPaymentId = paymentId;
    } else {
        const docRef = await addDoc(collection(db, 'rentalPayments'), paymentDataForDb as any);
        savedPaymentId = docRef.id;
    }

    if (paymentMethod === 'Efectivo') {
        await cashService.addCashTransaction({
            type: 'in',
            amount: Number(amount) || 0,
            concept: `Renta de ${driver.name} (${vehicle.licensePlate})`,
            userId: currentUser?.id || 'system',
            userName: currentUser?.name || 'Sistema',
            relatedType: 'Flotilla',
            relatedId: savedPaymentId,
            paymentMethod: 'Efectivo',
        });
    }
    
    return { id: savedPaymentId, ...rawPaymentData } as RentalPayment;
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

const addOwnerWithdrawal = async (data: Omit<OwnerWithdrawal, 'id' | 'date'> & { date: Date }): Promise<OwnerWithdrawal> => {
    if (!db) throw new Error("Database not initialized.");
    const newWithdrawal = { ...data, date: data.date.toISOString() };
    const docRef = await addDoc(collection(db, 'ownerWithdrawals'), cleanObjectForFirestore(newWithdrawal));

    // Also create a cash transaction for this withdrawal
    await cashService.addCashTransaction({
        type: 'out',
        amount: data.amount,
        concept: `Retiro de socio: ${data.ownerName}`,
        note: data.note,
        relatedType: 'RetiroSocio',
        relatedId: docRef.id,
    });
    
    return { id: docRef.id, ...newWithdrawal };
};

// --- Vehicle Expenses ---
const onVehicleExpensesUpdate = (callback: (expenses: VehicleExpense[]) => void): (() => void) => {
    if (!db) return () => {};
    return onSnapshot(query(collection(db, "vehicleExpenses"), orderBy("date", "desc")), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleExpense)));
    });
};

const addVehicleExpense = async (data: Partial<Omit<VehicleExpense, 'id' | 'date' | 'vehicleLicensePlate'>> & { vehicleId: string }): Promise<VehicleExpense> => {
    if (!db) throw new Error("Database not initialized.");
    
    const vehicle = await inventoryService.getVehicleById(data.vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    const newExpense: Omit<VehicleExpense, 'id'> = {
      date: new Date().toISOString(),
      vehicleLicensePlate: vehicle.licensePlate,
      vehicleId: vehicle.id,
      description: data.description ?? "",
      amount: Number(data.amount ?? 0),
    };
    
    const docRef = await addDoc(collection(db, 'vehicleExpenses'), cleanObjectForFirestore(newExpense));

    // Also create a cash transaction for this expense
    await cashService.addCashTransaction({
        type: 'out',
        amount: newExpense.amount,
        concept: `Gasto vehículo: ${newExpense.description} (${vehicle.licensePlate})`,
        relatedType: 'GastoVehiculo',
        relatedId: docRef.id,
    });

    const result: VehicleExpense = { 
        id: docRef.id, 
        vehicleId: newExpense.vehicleId,
        description: newExpense.description,
        amount: newExpense.amount,
        ...newExpense 
    };
    return result;
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