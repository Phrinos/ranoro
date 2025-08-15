
// src/lib/services/operations.service.ts

/**
 * This file is deprecated. Its functionalities have been moved to more specific
 * service files like `service.service.ts`, `sale.service.ts`, `fleet.service.ts`, etc.
 * Please update imports to use the new specific services instead of this file.
 * This file may be removed in a future update.
 */
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  getDocs,
  DocumentReference,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord, Vehicle, Technician, User, QuoteRecord, SaleReceipt, InventoryItem, Driver, RentalPayment, PaymentMethod, InitialCashBalance, CashDrawerTransaction, VehicleExpense, OwnerWithdrawal } from "@/types";
import { cleanObjectForFirestore } from '../forms';
import { logAudit, AUTH_USER_LOCALSTORAGE_KEY } from '../placeholder-data';
import { nanoid } from 'nanoid';
import { savePublicDocument } from '../public-document';
import { inventoryService } from './inventory.service';
import { cashService } from './cash.service';


// =========================================================================
// ==                          RENTAL OPERATIONS                          ==
// =========================================================================

const onRentalPaymentsUpdate = (callback: (payments: RentalPayment[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "rentalPayments"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalPayment)));
    });
};

const onRentalPaymentsUpdatePromise = async (): Promise<RentalPayment[]> => {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, "rentalPayments")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalPayment));
};

const addRentalPayment = async (
  driverId: string, 
  amount: number, 
  paymentMethod: PaymentMethod = 'Efectivo', 
  note?: string,
  mileage?: number
): Promise<RentalPayment> => {
    if (!db) throw new Error("Database not initialized.");
    
    const driverDoc = await getDoc(doc(db, 'drivers', driverId));
    if (!driverDoc.exists()) throw new Error("Driver not found");
    const driver = { id: driverDoc.id, ...driverDoc.data() } as any;

    const vehicle = driver.assignedVehicleId 
      ? await inventoryService.getVehicleById(driver.assignedVehicleId)
      : null;
    
    if (!vehicle) throw new Error("No vehicle assigned to this driver.");

    const dailyRate = vehicle.dailyRentalCost || 0;
    const daysCovered = dailyRate > 0 ? amount / dailyRate : 0;
    
    const authUserString = localStorage.getItem('authUser');
    const registeredBy = authUserString ? JSON.parse(authUserString).name : 'Sistema';

    const newPayment: Omit<RentalPayment, 'id'> = {
        driverId,
        driverName: driver.name,
        vehicleLicensePlate: vehicle.licensePlate,
        paymentDate: new Date().toISOString(),
        amount,
        daysCovered,
        note: note || `Pago de renta`,
        paymentMethod,
        registeredBy,
    };
    
    const batch = writeBatch(db);
    
    const paymentRef = doc(collection(db, 'rentalPayments'));
    batch.set(paymentRef, cleanObjectForFirestore(newPayment));

    // Update vehicle mileage if provided
    if (mileage !== undefined && vehicle.id) {
        const vehicleRef = doc(db, 'vehicles', vehicle.id);
        batch.update(vehicleRef, {
            currentMileage: mileage,
            lastMileageUpdate: new Date().toISOString(),
        });
    }

    await batch.commit();
    return { id: paymentRef.id, ...newPayment };
};

const updateRentalPayment = async (paymentId: string, data: Partial<RentalPayment>): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const paymentRef = doc(db, 'rentalPayments', paymentId);
    await updateDoc(paymentRef, cleanObjectForFirestore(data));
};

const addVehicleExpense = async (data: Omit<VehicleExpense, 'id' | 'date' | 'vehicleLicensePlate'>): Promise<VehicleExpense> => {
    if (!db) throw new Error("Database not initialized.");
    
    const vehicle = await inventoryService.getVehicleById(data.vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    const newExpense = {
        ...data,
        date: new Date().toISOString(),
        vehicleLicensePlate: vehicle.licensePlate,
    };
    const docRef = await addDoc(collection(db, 'vehicleExpenses'), cleanObjectForFirestore(newExpense));
    return { id: docRef.id, ...newExpense };
};

const addOwnerWithdrawal = async (data: Omit<OwnerWithdrawal, 'id' | 'date'>): Promise<OwnerWithdrawal> => {
    if (!db) throw new Error("Database not initialized.");
    const newWithdrawal = {
        ...data,
        date: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'ownerWithdrawals'), cleanObjectForFirestore(newWithdrawal));
    return { id: docRef.id, ...newWithdrawal };
};

// =========================================================================
// ==                          CASH DRAWER OPERATIONS                       ==
// =========================================================================

const onCashTransactionsUpdate = (callback: (transactions: CashDrawerTransaction[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'cashDrawerTransactions'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashDrawerTransaction)));
    }, (error) => {
        console.error("Error listening to cash transactions:", error.message);
        callback([]);
    });
};

const setInitialCashBalance = async (data: InitialCashBalance): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const dateId = data.date.split('T')[0]; // Use YYYY-MM-DD as ID
    const balanceRef = doc(db, 'initialCashBalances', dateId);
    await setDoc(balanceRef, cleanObjectForFirestore(data), { merge: true });
};

const addCashTransaction = async (data: Omit<CashDrawerTransaction, 'id'|'date'>): Promise<CashDrawerTransaction> => {
     if (!db) throw new Error("Database not initialized.");
    const transactionData = { ...data, date: new Date().toISOString() };
    const docRef = await addDoc(collection(db, 'cashDrawerTransactions'), cleanObjectForFirestore(transactionData));
    return { id: docRef.id, ...transactionData };
};

const deleteCashTransaction = async (transactionId: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const transactionRef = doc(db, 'cashDrawerTransactions', transactionId);
    await deleteDoc(transactionRef);
};



export const operationsService = {
  addRentalPayment,
  updateRentalPayment,
  addVehicleExpense,
  addOwnerWithdrawal,
  onRentalPaymentsUpdate,
  onRentalPaymentsUpdatePromise,
  setInitialCashBalance,
  onCashTransactionsUpdate,
  addCashTransaction,
  deleteCashTransaction,
};
