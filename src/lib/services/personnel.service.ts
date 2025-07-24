

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
import type { Technician, AdministrativeStaff, Driver, Personnel, Area } from "@/types";
import type { PersonnelFormValues } from '@/app/(app)/personal/components/personnel-form';
import { cleanObjectForFirestore } from '../forms';
import { inventoryService } from './inventory.service';

// --- Unified Personnel ---
const onPersonnelUpdate = (callback: (personnel: Personnel[]) => void): (() => void) => {
    if (!db) return () => {};
    // This now ONLY listens to the new, unified 'personnel' collection.
    // The logic to combine old collections has been removed to fix the bug.
    const personnelUnsubscribe = onSnapshot(query(collection(db, "personnel")), (snapshot) => {
        const personnelList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Personnel));
        callback(personnelList);
    });

    return () => {
        personnelUnsubscribe();
    };
};

const onPersonnelUpdatePromise = async (): Promise<Personnel[]> => {
    if (!db) return [];
    const personnelSnapshot = await getDocs(collection(db, "personnel"));
    return personnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Personnel));
};


const savePersonnel = async (data: PersonnelFormValues, id?: string): Promise<Personnel> => {
    if (!db) throw new Error("Database not initialized.");
    const dataToSave = {
        ...data,
        hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
    };
    const cleanedData = cleanObjectForFirestore(dataToSave);
    
    if (id) {
        await updateDoc(doc(db, 'personnel', id), cleanedData);
        return { id, ...dataToSave };
    } else {
        const fullData = { ...cleanedData, isArchived: false };
        const docRef = await addDoc(collection(db, 'personnel'), fullData);
        return { id: docRef.id, ...fullData };
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

const getDriverById = async (id: string): Promise<Driver | undefined> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, 'drivers', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Driver : undefined;
};

const saveDriver = async (data: Partial<DriverFormValues>, existingId?: string): Promise<Driver> => {
    if (!db) throw new Error("Database not initialized.");
    const dataToSave = {
        ...data,
        depositAmount: data.depositAmount ? Number(data.depositAmount) : undefined,
        contractDate: data.contractDate ? new Date(data.contractDate).toISOString() : undefined,
    };

    if (existingId) {
        const docRef = doc(db, 'drivers', existingId);
        await updateDoc(docRef, cleanObjectForFirestore(dataToSave));
        const docSnap = await getDoc(docRef);
        return { id: docSnap.id, ...(docSnap.data() as Omit<Driver, 'id'>) };
    } else {
        const newDriverData = { ...dataToSave, documents: {}, manualDebts: [], isArchived: false };
        const docRef = await addDoc(collection(db, 'drivers'), cleanObjectForFirestore(newDriverData));
        return { id: docRef.id, ...newDriverData };
    }
};

const archiveDriver = async (id: string, isArchived: boolean): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");

    const batch = writeBatch(db);
    const driverRef = doc(db, 'drivers', id);
    
    // Archive/unarchive the driver
    batch.update(driverRef, { isArchived });

    // If archiving, unassign the vehicle from the driver
    if (isArchived) {
        const driverDoc = await getDoc(driverRef);
        const driverData = driverDoc.data() as Driver;
        if (driverData?.assignedVehicleId) {
            batch.update(driverRef, { assignedVehicleId: null });
        }
    }

    await batch.commit();
};


export const personnelService = {
    onPersonnelUpdate,
    onPersonnelUpdatePromise,
    savePersonnel,
    archivePersonnel,
    onDriversUpdate,
    getDriverById,
    saveDriver,
    archiveDriver,
    onAreasUpdate,
    saveArea,
    deleteArea,
};
