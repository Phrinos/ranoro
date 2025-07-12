
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

// --- Technicians ---

const onTechniciansUpdate = (callback: (technicians: Technician[]) => void): (() => void) => {
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
    const docRef = doc(db, 'technicians', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Technician : undefined;
};

const addTechnician = async (data: TechnicianFormValues): Promise<Technician> => {
    const newTechnicianData = {
        ...data,
        isArchived: false,
    };
    const docRef = await addDoc(collection(db, 'technicians'), newTechnicianData);
    return { id: docRef.id, ...newTechnicianData };
};

// --- Administrative Staff ---

const onAdminStaffUpdate = (callback: (staff: AdministrativeStaff[]) => void): (() => void) => {
    const unsubscribe = onSnapshot(collection(db, "administrativeStaff"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdministrativeStaff)));
    });
    return unsubscribe;
};

const addAdminStaff = async (data: AdministrativeStaffFormValues): Promise<AdministrativeStaff> => {
    const newStaffData = {
        ...data,
        isArchived: false,
    };
    const docRef = await addDoc(collection(db, 'administrativeStaff'), newStaffData);
    return { id: docRef.id, ...newStaffData };
};

// --- Drivers ---

const onDriversUpdate = (callback: (drivers: Driver[]) => void): (() => void) => {
    const unsubscribe = onSnapshot(collection(db, "drivers"), (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver)));
    });
    return unsubscribe;
};

const saveDriver = async (data: DriverFormValues, existingId?: string): Promise<Driver> => {
    if (existingId) {
        const docRef = doc(db, 'drivers', existingId);
        await updateDoc(docRef, data);
        const docSnap = await getDoc(docRef);
        return { id: docSnap.id, ...docSnap.data() } as Driver;
    } else {
        const newDriverData = { ...data, documents: {} };
        const docRef = await addDoc(collection(db, 'drivers'), newDriverData);
        return { id: docRef.id, ...newDriverData };
    }
};

export const personnelService = {
    onTechniciansUpdate,
    onTechniciansUpdatePromise,
    getTechnicianById,
    addTechnician,
    onAdminStaffUpdate,
    addAdminStaff,
    onDriversUpdate,
    saveDriver
};
