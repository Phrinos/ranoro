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
  getDocs,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { RentalPayment, DailyRentalCharge, Driver, Vehicle, OwnerWithdrawal, VehicleExpense, PaymentMethod, User } from "@/types";
import { cleanObjectForFirestore } from '../forms';
import { cashService } from './cash.service';
import { inventoryService } from './inventory.service';
import { adminService } from './admin.service';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';
import { AUTH_USER_LOCALSTORAGE_KEY } from '../constants/app';

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

/**
 * Genera manualmente los cargos de renta para todos los conductores activos en una fecha específica.
 * Útil para recuperar cargos no generados por la función programada.
 */
const generateManualDailyCharges = async (targetDate: Date, currentUser: User): Promise<number> => {
    if (!db) throw new Error("Database not initialized.");
    const TZ = 'America/Mexico_City';

    const zonedDate = toZonedTime(targetDate, TZ);
    const dateKey = formatInTimeZone(zonedDate, TZ, 'yyyy-MM-dd');
    
    const start = startOfDay(zonedDate);
    const end = endOfDay(zonedDate);

    // 1. Obtener conductores activos con vehículo
    const driversSnap = await getDocs(query(collection(db, 'drivers'), where('isArchived', '==', false)));
    const batch = writeBatch(db);
    let createdCount = 0;

    const ops = driversSnap.docs.map(async (driverDoc) => {
        const driver = driverDoc.data() as any;
        const vehicleId = driver.assignedVehicleId;
        if (!vehicleId) return false;

        const vehicleSnap = await getDoc(doc(db, 'vehicles', vehicleId));
        if (!vehicleSnap.exists()) return false;
        
        const vehicle = vehicleSnap.data() as any;
        const amount = vehicle.dailyRentalCost;
        if (!amount) return false;

        const chargeId = `${driverDoc.id}_${dateKey}`;
        const chargeRef = doc(db, 'dailyRentalCharges', chargeId);
        const chargeSnap = await getDoc(chargeRef);

        // Solo crear si no existe ya un cargo para ese chofer en esa fecha
        if (!chargeSnap.exists()) {
            batch.set(chargeRef, {
                driverId: driverDoc.id,
                vehicleId: vehicleId,
                amount,
                vehicleLicensePlate: vehicle.licensePlate || '',
                date: Timestamp.fromDate(start),
                dateKey,
                dayStartUtc: Timestamp.fromDate(start),
                dayEndUtc: Timestamp.fromDate(end),
                note: `Generado manualmente para el ${dateKey}`
            });
            return true;
        }
        return false;
    });

    const results = await Promise.all(ops);
    createdCount = results.filter(Boolean).length;

    if (createdCount > 0) {
        await batch.commit();
        // Auditar la acción
        await adminService.logAudit('Crear', `Generó manualmente ${createdCount} cargos de renta para la fecha ${dateKey}.`, {
            entityType: 'Flotilla',
            userId: currentUser.id,
            userName: currentUser.name
        });
    }
    return createdCount;
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
    
    const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
    const currentUser = authUserString ? JSON.parse(authUserString) : null;
    
    const rawPaymentData = {
        driverId: String(driver.id),
        driverName: driver.name,
        vehicleLicensePlate: vehicle.licensePlate,
        vehicleId: vehicle.id,
        dailyRate,
        paymentDate: paymentDateIso,
        registeredAt: new Date().toISOString(), // always the real moment of registration
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
            type: 'Entrada',
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
    
    const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
    const currentUser = authUserString ? JSON.parse(authUserString) : null;
    
    const newWithdrawal = { ...data, date: data.date.toISOString() };
    const docRef = await addDoc(collection(db, 'ownerWithdrawals'), cleanObjectForFirestore(newWithdrawal));

    await cashService.addCashTransaction({
        type: 'Salida',
        amount: data.amount,
        concept: `Retiro de socio: ${data.ownerName}`,
        note: data.note,
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Sistema',
        relatedType: 'RetiroSocio',
        relatedId: docRef.id,
        paymentMethod: 'Efectivo',
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

    await cashService.addCashTransaction({
        type: 'Salida',
        amount: newExpense.amount,
        concept: `Gasto vehículo: ${newExpense.description} (${vehicle.licensePlate})`,
        relatedType: 'GastoVehiculo',
        relatedId: docRef.id,
    });

    return { ...newExpense, id: docRef.id } as VehicleExpense;
};

// --- Monthly Balance Cutoffs ---

export interface FleetMonthlyBalance {
  id: string; // `{driverId}_{yyyy-MM}`
  driverId: string;
  month: string; // "2026-04"
  carryoverBalance: number; // negative = debt from prior month
  closedAt: string | null;
}

const getMonthlyDriverBalance = async (driverId: string, month: string): Promise<FleetMonthlyBalance | null> => {
    if (!db) return null;
    const docId = `${driverId}_${month}`;
    const docSnap = await getDoc(doc(db, 'fleetMonthlyBalances', docId));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as FleetMonthlyBalance : null;
};

const onMonthlyBalancesUpdate = (callback: (balances: FleetMonthlyBalance[]) => void, month: string): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, 'fleetMonthlyBalances'), where('month', '==', month));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FleetMonthlyBalance)));
    });
};

/**
 * Closes a month: Calculates the net balance for each driver in the given month
 * and persists it as carryover for the next month.
 * This is NON-DESTRUCTIVE: payments can still be added to closed months.
 */
const closeMonth = async (
  month: string,
  drivers: Driver[],
  dailyCharges: DailyRentalCharge[],
  payments: RentalPayment[],
  manualDebts: { driverId: string; amount: number; date: string }[],
): Promise<number> => {
    if (!db) throw new Error("Database not initialized.");
    
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
    
    // Calculate next month key
    const nextDate = new Date(year, monthNum, 1);
    const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    
    const batch = writeBatch(db);
    let count = 0;
    
    const activeDrivers = drivers.filter(d => !d.isArchived);
    
    for (const driver of activeDrivers) {
        // Get carryover FROM this month (set by closing the previous month)
        const thisMonthBalance = await getMonthlyDriverBalance(driver.id, month);
        const carryover = thisMonthBalance?.carryoverBalance ?? 0;
        
        // Calculate charges for this month
        const monthCharges = dailyCharges
            .filter(c => {
                if (c.driverId !== driver.id) return false;
                const d = new Date(typeof c.date === 'string' ? c.date : (c.date as any)?.seconds ? new Date((c.date as any).seconds * 1000).toISOString() : '');
                return d >= startDate && d <= endDate;
            })
            .reduce((sum, c) => sum + c.amount, 0);
        
        const monthDebts = manualDebts
            .filter(d => {
                if (d.driverId !== driver.id) return false;
                const dt = new Date(d.date);
                return dt >= startDate && dt <= endDate;
            })
            .reduce((sum, d) => sum + d.amount, 0);
        
        const monthPayments = payments
            .filter(p => {
                if (p.driverId !== driver.id) return false;
                const dt = new Date(p.paymentDate || p.date);
                return dt >= startDate && dt <= endDate;
            })
            .reduce((sum, p) => sum + p.amount, 0);
        
        // Net balance for this month: payments - charges - debts + carryover
        const netBalance = monthPayments - monthCharges - monthDebts + carryover;
        
        // Persist as carryover for NEXT month
        const nextDocId = `${driver.id}_${nextMonth}`;
        const nextDocRef = doc(db, 'fleetMonthlyBalances', nextDocId);
        batch.set(nextDocRef, {
            driverId: driver.id,
            month: nextMonth,
            carryoverBalance: netBalance,
            closedAt: new Date().toISOString(),
        }, { merge: true });
        
        count++;
    }
    
    if (count > 0) await batch.commit();
    return count;
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
  generateManualDailyCharges,
  getMonthlyDriverBalance,
  onMonthlyBalancesUpdate,
  closeMonth,
};
