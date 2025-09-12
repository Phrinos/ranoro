

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
import type { Technician, AdministrativeStaff, Personnel, Area, User, Driver, Vehicle } from "@/types";
import { cleanObjectForFirestore } from '../forms';
import type { UserFormValues } from '@/app/(app)/administracion/components/user-form';
import { inventoryService } from './inventory.service';

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

const saveDriver = async (data: Partial<Driver>, id: string): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await updateDoc(doc(db, 'drivers', id), cleanObjectForFirestore(data));
};

const assignVehicleToDriver = async (
    vehicle: Vehicle,
    newDriverId: string | null,
    allDrivers: Driver[]
): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const batch = writeBatch(db);
    const vehicleRef = doc(db, 'vehicles', vehicle.id);
    const oldDriverId = vehicle.assignedDriverId;

    const newDriver = newDriverId ? allDrivers.find(d => d.id === newDriverId) : null;

    batch.update(vehicleRef, { 
        assignedDriverId: newDriverId,
        assignedDriverName: newDriver?.name || null 
    });

    if (oldDriverId && oldDriverId !== newDriverId) {
        const oldDriverRef = doc(db, 'drivers', oldDriverId);
        batch.update(oldDriverRef, { 
            assignedVehicleId: null,
            assignedVehicleLicensePlate: null 
        });
    }
    
    if (newDriver) {
        if (newDriver.assignedVehicleId && newDriver.assignedVehicleId !== vehicle.id) {
            const otherVehicleRef = doc(db, 'vehicles', newDriver.assignedVehicleId);
            batch.update(otherVehicleRef, { 
                assignedDriverId: null,
                assignedDriverName: null 
            });
        }
        
        const newDriverRef = doc(db, 'drivers', newDriver.id);
        batch.update(newDriverRef, { 
            assignedVehicleId: vehicle.id,
            assignedVehicleLicensePlate: vehicle.licensePlate 
        });
    }
    
    await batch.commit();
};


export const personnelService = {
    onPersonnelUpdate,
    onPersonnelUpdatePromise,
    savePersonnel,
    archivePersonnel,
    onAreasUpdate,
    saveArea,
    deleteArea,
    onDriversUpdate,
    onDriversUpdatePromise,
    getDriverById,
    saveDriver,
    assignVehicleToDriver,
};
