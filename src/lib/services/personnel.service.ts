

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
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { Technician, AdministrativeStaff, Driver, Personnel, Area, User, Vehicle, ManualDebtEntry } from "@/types";
import type { DriverFormValues } from '@/app/(app)/conductores/components/driver-form';
import { cleanObjectForFirestore } from '../forms';
import { inventoryService } from './inventory.service';
import type { UserFormValues } from '@/app/(app)/administracion/components/user-form';

// --- Unified Personnel ---
const onPersonnelUpdate = (callback: (personnel: Personnel[]) => void): (() => void) => {
    if (!db) return () => {};
    const personnelUnsubscribe = onSnapshot(query(collection(db, "users")), (snapshot) => {
        const personnelList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Personnel));
        callback(personnelList);
    });

    return () => {
        personnelUnsubscribe();
    };
};

const onPersonnelUpdatePromise = async (): Promise<Personnel[]> => {
    if (!db) return [];
    const personnelSnapshot = await getDocs(collection(db, "users"));
    return personnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Personnel));
};


const savePersonnel = async (data: UserFormValues, id?: string): Promise<User> => {
    if (!db) throw new Error("Database not initialized.");
    const dataToSave = {
        ...data,
        hireDate: data.hireDate ? new Date(data.hireDate).toISOString() : undefined,
    };
    const cleanedData = cleanObjectForFirestore(dataToSave);
    
    if (id) {
        await updateDoc(doc(db, 'users', id), cleanedData);
        return { id, ...dataToSave } as User;
    } else {
        const fullData = { ...cleanedData, isArchived: false, createdAt: new Date().toISOString() };
        const docRef = await addDoc(collection(db, 'users'), fullData);
        return { id: docRef.id, ...fullData } as User;
    }
};

const archivePersonnel = async (id: string, isArchived: boolean): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await updateDoc(doc(db, 'personnel', id), { isArchived });
};


// --- Areas ---

const onAreasUpdate = (callback: (areas: Area[]) => void): (() => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "workAreas"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Area)));
    });
    return unsubscribe;
};

const saveArea = async (data: Omit<Area, 'id'>, id?: string): Promise<Area> => {
    if (!db) throw new Error("Database not initialized.");
    if (id) {
        await updateDoc(doc(db, 'workAreas', id), data);
        return { id, ...data };
    } else {
        const docRef = await addDoc(collection(db, 'workAreas'), data);
        return { id: docRef.id, ...data };
    }
};

const deleteArea = async (id: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await deleteDoc(doc(db, 'workAreas', id));
};


// --- Drivers ---

const onDriversUpdate = (callback: (drivers: Driver[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "drivers"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver)));
    });
    return unsubscribe;
};

const onDriversUpdatePromise = async (): Promise<Driver[]> => {
    if (!db) return [];
    const snapshot = await getDocs(query(collection(db, "drivers")));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
};

const getDriverById = async (id: string): Promise<Driver | undefined> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, 'drivers', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Driver : undefined;
};

const saveDriver = async (data: Partial<DriverFormValues>, existingId?: string): Promise<Driver> => {
    if (!db) throw new Error("Database not initialized.");
    const isEditing = !!existingId;
    const driverId = existingId || doc(collection(db, 'drivers')).id;

    const dataToSave = {
        name: data.name,
        address: data.address,
        phone: data.phone,
        emergencyPhone: data.emergencyPhone,
        requiredDepositAmount: data.requiredDepositAmount ? Number(data.requiredDepositAmount) : undefined,
        depositAmount: data.depositAmount ? Number(data.depositAmount) : undefined,
        contractDate: data.contractDate ? new Date(data.contractDate).toISOString() : undefined,
    };
    
    const batch = writeBatch(db);
    
    // Save or update driver document
    const driverRef = doc(db, 'drivers', driverId);
    if (isEditing) {
        batch.update(driverRef, cleanObjectForFirestore(dataToSave));
    } else {
        const newDriverData = { ...dataToSave, isArchived: false, documents: {} };
        batch.set(driverRef, cleanObjectForFirestore(newDriverData));
    }
    
    // Handle deposit debt in the manualDebts collection
    const depositDifference = (data.requiredDepositAmount || 0) - (data.depositAmount || 0);
    const q = query(collection(db, 'manualDebts'), where('driverId', '==', driverId), where('note', '==', 'Adeudo de depósito inicial'));
    const depositDebtSnapshot = await getDocs(q);

    if (depositDifference > 0) {
        if (!depositDebtSnapshot.empty) {
            // Update existing deposit debt
            const debtDocRef = depositDebtSnapshot.docs[0].ref;
            batch.update(debtDocRef, { amount: depositDifference });
        } else {
            // Create new deposit debt
            const newDebtRef = doc(collection(db, 'manualDebts'));
            batch.set(newDebtRef, {
                driverId: driverId,
                date: new Date().toISOString(),
                amount: depositDifference,
                note: 'Adeudo de depósito inicial',
            });
        }
    } else if (!depositDebtSnapshot.empty) {
        // Delete existing deposit debt if it's no longer applicable
        const debtDocRef = depositDebtSnapshot.docs[0].ref;
        batch.delete(debtDocRef);
    }
    
    await batch.commit();

    const savedDriverDoc = await getDoc(driverRef);
    return { id: driverId, ...(savedDriverDoc.data() as Omit<Driver, 'id'>) };
};

const assignVehicleToDriver = async (
    driver: Driver,
    newVehicleId: string | null,
    allVehicles: Vehicle[]
): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const batch = writeBatch(db);
    const driverRef = doc(db, 'drivers', driver.id);
    const oldVehicleId = driver.assignedVehicleId;

    // 1. Update the driver's assignedVehicleId
    batch.update(driverRef, { assignedVehicleId: newVehicleId });

    // 2. If the vehicle assignment has changed, handle all necessary updates
    if (oldVehicleId !== newVehicleId) {
        // A) If there was an old vehicle, it must be un-assigned.
        if (oldVehicleId) {
            const oldVehicleRef = inventoryService.getVehicleDocRef(oldVehicleId);
            batch.update(oldVehicleRef, { assignedDriverId: null });
        }
        
        // B) If there is a new vehicle, it must be assigned.
        if (newVehicleId) {
            const vehicleToAssign = allVehicles.find(v => v.id === newVehicleId);
            const newVehicleRef = inventoryService.getVehicleDocRef(newVehicleId);

            // B.1) If the new vehicle was assigned to someone else, un-assign it from the other driver.
            if (vehicleToAssign?.assignedDriverId && vehicleToAssign.assignedDriverId !== driver.id) {
                const otherDriverRef = getDriverDocRef(vehicleToAssign.assignedDriverId);
                batch.update(otherDriverRef, { assignedVehicleId: null });
            }
            
            // B.2) Assign the current driver to the new vehicle.
            batch.update(newVehicleRef, { assignedDriverId: driver.id });
        }
    }
    
    await batch.commit();
};



const archiveDriver = async (id: string, isArchived: boolean): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const batch = writeBatch(db);
    const driverRef = doc(db, 'drivers', id);
    batch.update(driverRef, { isArchived });
    if (isArchived) {
        const driverDoc = await getDoc(driverRef);
        const driverData = driverDoc.data() as Driver;
        if (driverData?.assignedVehicleId) {
            const vehicleRef = doc(db, 'vehicles', driverData.assignedVehicleId);
            batch.update(vehicleRef, { assignedDriverId: null });
            batch.update(driverRef, { assignedVehicleId: null });
        }
    }
    await batch.commit();
};

const getDriverDocRef = (id: string) => {
    if (!db) throw new Error("Database not initialized.");
    return doc(db, 'drivers', id);
}

// --- Manual Debts ---
const onManualDebtsUpdate = (driverId: string, callback: (debts: ManualDebtEntry[]) => void): (() => void) => {
    if (!db) return () => {};
    let q;
    if (driverId) {
        q = query(collection(db, 'manualDebts'), where('driverId', '==', driverId));
    } else {
        q = query(collection(db, 'manualDebts'));
    }
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ManualDebtEntry)));
    });
};

const saveManualDebt = async (driverId: string, data: Omit<ManualDebtEntry, 'id' | 'driverId' | 'date'>, id?: string): Promise<ManualDebtEntry> => {
    if (!db) throw new Error("Database not initialized.");
    const debtData = { ...data, driverId, date: new Date().toISOString() };
    if (id) {
        await updateDoc(doc(db, 'manualDebts', id), cleanObjectForFirestore(debtData));
        return { id, ...debtData };
    } else {
        const docRef = await addDoc(collection(db, 'manualDebts'), cleanObjectForFirestore(debtData));
        return { id: docRef.id, ...debtData };
    }
};

const deleteManualDebt = async (id: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await deleteDoc(doc(db, 'manualDebts', id));
};


export const personnelService = {
    onPersonnelUpdate,
    onPersonnelUpdatePromise,
    savePersonnel,
    archivePersonnel,
    onDriversUpdate,
    onDriversUpdatePromise,
    getDriverById,
    getDriverDocRef,
    saveDriver,
    assignVehicleToDriver,
    archiveDriver,
    onAreasUpdate,
    saveArea,
    deleteArea,
    onManualDebtsUpdate,
    saveManualDebt,
    deleteManualDebt,
};
