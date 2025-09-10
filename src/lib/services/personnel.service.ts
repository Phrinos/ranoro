
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
import type { Technician, AdministrativeStaff, Driver, Personnel, Area, User, Vehicle } from "@/types";
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
    const dataToSave = {
        ...data,
        depositAmount: data.depositAmount ? Number(data.depositAmount) : undefined,
        requiredDepositAmount: data.requiredDepositAmount ? Number(data.requiredDepositAmount) : undefined,
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

const saveDriverWithVehicleAssignment = async (
    originalDriver: Driver,
    formData: DriverFormValues,
    allVehicles: Vehicle[]
): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const batch = writeBatch(db);
    const driverRef = doc(db, 'drivers', originalDriver.id);

    const oldVehicleId = originalDriver.assignedVehicleId;
    const newVehicleId = formData.assignedVehicleId || null;

    // 1. Update the driver's own data from the form
    const driverDataToSave = {
        ...formData,
        assignedVehicleId: newVehicleId,
        depositAmount: formData.depositAmount ? Number(formData.depositAmount) : 0,
        requiredDepositAmount: formData.requiredDepositAmount ? Number(formData.requiredDepositAmount) : 0,
        contractDate: formData.contractDate ? new Date(formData.contractDate).toISOString() : null,
    };
    batch.update(driverRef, cleanObjectForFirestore(driverDataToSave));

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
            if (vehicleToAssign?.assignedDriverId && vehicleToAssign.assignedDriverId !== originalDriver.id) {
                const otherDriverRef = getDriverDocRef(vehicleToAssign.assignedDriverId);
                batch.update(otherDriverRef, { assignedVehicleId: null });
            }
            
            // B.2) Assign the current driver to the new vehicle.
            batch.update(newVehicleRef, { assignedDriverId: originalDriver.id });
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
    saveDriverWithVehicleAssignment,
    archiveDriver,
    onAreasUpdate,
    saveArea,
    deleteArea,
};
