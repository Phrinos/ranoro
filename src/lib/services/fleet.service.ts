

import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  query,
  DocumentReference,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { RentalPayment, VehicleExpense, OwnerWithdrawal, Vehicle, PaymentMethod, User } from "@/types";
import { cleanObjectForFirestore } from '../forms';
import { inventoryService } from './inventory.service';
import { nanoid } from 'nanoid';

// --- Rental Payments ---

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

const deleteRentalPayment = async (paymentId: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await deleteDoc(doc(db, "rentalPayments", paymentId));
};


// --- Vehicle Expenses ---
const onVehicleExpensesUpdate = (callback: (expenses: VehicleExpense[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "vehicleExpenses"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleExpense)));
    });
};

const onVehicleExpensesUpdatePromise = async (): Promise<VehicleExpense[]> => {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, "vehicleExpenses")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleExpense));
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

const deleteVehicleExpense = async (expenseId: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await deleteDoc(doc(db, "vehicleExpenses", expenseId));
};

// --- Owner Withdrawals ---
const onOwnerWithdrawalsUpdate = (callback: (withdrawals: OwnerWithdrawal[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "ownerWithdrawals"));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OwnerWithdrawal)));
    });
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

const deleteOwnerWithdrawal = async (withdrawalId: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  await deleteDoc(doc(db, "ownerWithdrawals", withdrawalId));
};


export const fleetService = {
  addRentalPayment,
  updateRentalPayment,
  onRentalPaymentsUpdate,
  onRentalPaymentsUpdatePromise,
  deleteRentalPayment,
  addVehicleExpense,
  onVehicleExpensesUpdate,
  onVehicleExpensesUpdatePromise,
  deleteVehicleExpense,
  addOwnerWithdrawal,
  onOwnerWithdrawalsUpdate,
  deleteOwnerWithdrawal,
};
