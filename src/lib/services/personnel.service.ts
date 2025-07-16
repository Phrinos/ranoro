

import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { Technician, AdministrativeStaff, Driver } from "@/types";
import type { TechnicianFormValues } from "@/app/(app)/tecnicos/components/technician-form";
import type { AdministrativeStaffFormValues } from "@/app/(app)/administrativos/components/administrative-staff-form";
import type { DriverFormValues } from "@/app/(app)/conductores/components/driver-form";
import { cleanObjectForFirestore } from '../forms';

// --- Technicians ---

const onTechniciansUpdate = (callback: (technicians: Technician[]) => void): (() => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "technicians"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Technician)));
    });
    return unsubscribe;
};

const onTechniciansUpdatePromise = async (): Promise<Technician[]> => {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, "technicians"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Technician));
};


const getTechnicianById = async (id: string): Promise<Technician | undefined> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, 'technicians', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Technician : undefined;
};

const saveTechnician = async (data: Partial<TechnicianFormValues>, id: string): Promise<Technician> => {
    if (!db) throw new Error("Database not initialized.");
    const dataToSave = {
        ...data,
        hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
        monthlySalary: data.monthlySalary ? Number(data.monthlySalary) : undefined,
        commissionRate: data.commissionRate ? Number(data.commissionRate) : undefined,
        standardHoursPerDay: data.standardHoursPerDay ? Number(data.standardHoursPerDay) : undefined,
    };

    await updateDoc(doc(db, 'technicians', id), cleanObjectForFirestore(dataToSave));
    const updatedDoc = await getDoc(doc(db, 'technicians', id));
    return { id, ...(updatedDoc.data() as Omit<Technician, 'id'>) };
};

const addTechnician = async (data: TechnicianFormValues) => {
    if (!db) throw new Error("Database not initialized.");
    const fullData = { ...data, isArchived: false, hireDate: data.hireDate || new Date().toISOString() };
    await addDoc(collection(db, 'technicians'), cleanObjectForFirestore(fullData));
};

const archiveTechnician = async (id: string, isArchived: boolean): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await updateDoc(doc(db, 'technicians', id), { isArchived });
};


// --- Administrative Staff ---

const onAdminStaffUpdate = (callback: (staff: AdministrativeStaff[]) => void): (() => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "administrativeStaff"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdministrativeStaff)));
    });
    return unsubscribe;
};

const onAdminStaffUpdatePromise = async (): Promise<AdministrativeStaff[]> => {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, "administrativeStaff"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdministrativeStaff));
}

const getAdminStaffById = async (id: string): Promise<AdministrativeStaff | undefined> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, 'administrativeStaff', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as AdministrativeStaff : undefined;
}

const saveAdminStaff = async (data: Partial<AdministrativeStaffFormValues>, id: string): Promise<AdministrativeStaff> => {
    if (!db) throw new Error("Database not initialized.");
    const dataToSave = {
        ...data,
        hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
        monthlySalary: data.monthlySalary ? Number(data.monthlySalary) : undefined,
        commissionRate: data.commissionRate ? Number(data.commissionRate) : undefined,
    };
    await updateDoc(doc(db, 'administrativeStaff', id), cleanObjectForFirestore(dataToSave));
    const updatedDoc = await getDoc(doc(db, 'administrativeStaff', id));
    return { id, ...(updatedDoc.data() as Omit<AdministrativeStaff, 'id'>) };
};

const addAdminStaff = async (data: AdministrativeStaffFormValues) => {
    if (!db) throw new Error("Database not initialized.");
    const fullData = { ...data, isArchived: false, hireDate: data.hireDate || new Date().toISOString() };
    await addDoc(collection(db, 'administrativeStaff'), cleanObjectForFirestore(fullData));
};

const archiveAdminStaff = async (id: string, isArchived: boolean): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    await updateDoc(doc(db, 'administrativeStaff', id), { isArchived });
};


// --- Drivers ---

const onDriversUpdate = (callback: (drivers: Driver[]) => void): (() => void) => {
    if (!db) return () => {};
    const unsubscribe = onSnapshot(collection(db, "drivers"), (snapshot) => {
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
        const newDriverData = { ...dataToSave, documents: {}, manualDebts: [] };
        const docRef = await addDoc(collection(db, 'drivers'), cleanObjectForFirestore(newDriverData));
        return { id: docRef.id, ...newDriverData };
    }
};

export const personnelService = {
    onTechniciansUpdate,
    onTechniciansUpdatePromise,
    getTechnicianById,
    saveTechnician,
    addTechnician,
    archiveTechnician,
    onAdminStaffUpdate,
    onAdminStaffUpdatePromise,
    getAdminStaffById,
    saveAdminStaff,
    addAdminStaff,
    archiveAdminStaff,
    onDriversUpdate,
    getDriverById,
    saveDriver
};
