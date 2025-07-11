

import type { Technician, AdministrativeStaff, Driver } from "@/types";
import type { TechnicianFormValues } from "@/app/(app)/tecnicos/components/technician-form";
import type { AdministrativeStaffFormValues } from "@/app/(app)/administrativos/components/administrative-staff-form";
import type { DriverFormValues } from "@/app/(app)/conductores/components/driver-form";
import { db } from '@/lib/firebaseClient.js';
import { collection, onSnapshot, doc, addDoc, setDoc } from 'firebase/firestore';

// --- Technicians ---

const onTechniciansUpdate = (callback: (technicians: Technician[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'technicians'), snapshot => {
        const technicians = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Technician));
        callback(technicians);
    });
};

const getTechnicianById = async (id: string): Promise<Technician | undefined> => {
    const docSnap = await getDoc(doc(db, 'technicians', id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Technician : undefined;
};

const addTechnician = async (data: TechnicianFormValues): Promise<Technician> => {
    const newDoc = await addDoc(collection(db, 'technicians'), {
        ...data,
        isArchived: false,
    });
    return { id: newDoc.id, ...data, isArchived: false } as Technician;
};

// --- Administrative Staff ---

const onAdminStaffUpdate = (callback: (staff: AdministrativeStaff[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'administrativeStaff'), snapshot => {
        const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdministrativeStaff));
        callback(staff);
    });
};

const addAdminStaff = async (data: AdministrativeStaffFormValues): Promise<AdministrativeStaff> => {
    const newDoc = await addDoc(collection(db, 'administrativeStaff'), {
        ...data,
        isArchived: false,
    });
    return { id: newDoc.id, ...data, isArchived: false } as AdministrativeStaff;
};

// --- Drivers ---

const onDriversUpdate = (callback: (drivers: Driver[]) => void): (() => void) => {
    return onSnapshot(collection(db, 'drivers'), snapshot => {
        const drivers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
        callback(drivers);
    });
};

const saveDriver = async (data: DriverFormValues, existingId?: string): Promise<Driver> => {
    if (existingId) {
        const docRef = doc(db, 'drivers', existingId);
        await setDoc(docRef, data, { merge: true });
        const docSnap = await getDoc(docRef);
        return { id: docSnap.id, ...docSnap.data() } as Driver;
    } else {
        const newDoc = await addDoc(collection(db, 'drivers'), data);
        return { id: newDoc.id, ...data, documents: {} } as Driver;
    }
};

export const personnelService = {
    onTechniciansUpdate,
    getTechnicianById,
    addTechnician,
    onAdminStaffUpdate,
    addAdminStaff,
    onDriversUpdate,
    saveDriver
};
