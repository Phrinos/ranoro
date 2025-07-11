

import type { Technician, AdministrativeStaff, Driver } from "@/types";
import type { TechnicianFormValues } from "@/app/(app)/tecnicos/components/technician-form";
import type { AdministrativeStaffFormValues } from "@/app/(app)/administrativos/components/administrative-staff-form";
import type { DriverFormValues } from "@/app/(app)/conductores/components/driver-form";
import { 
    placeholderTechnicians, 
    placeholderAdministrativeStaff,
    placeholderDrivers,
    persistToFirestore
} from '../placeholder-data';


// --- Technicians ---

const onTechniciansUpdate = (callback: (technicians: Technician[]) => void): (() => void) => {
    callback([...placeholderTechnicians]);
    return () => {};
};

const getTechnicianById = async (id: string): Promise<Technician | undefined> => {
    return placeholderTechnicians.find(t => t.id === id);
};

const addTechnician = async (data: TechnicianFormValues): Promise<Technician> => {
    const newTechnician: Technician = {
        id: `tech_${Date.now()}`,
        ...data,
        isArchived: false,
    };
    placeholderTechnicians.push(newTechnician);
    await persistToFirestore(['technicians']);
    return newTechnician;
};

// --- Administrative Staff ---

const onAdminStaffUpdate = (callback: (staff: AdministrativeStaff[]) => void): (() => void) => {
    callback([...placeholderAdministrativeStaff]);
    return () => {};
};

const addAdminStaff = async (data: AdministrativeStaffFormValues): Promise<AdministrativeStaff> => {
    const newStaff: AdministrativeStaff = {
        id: `adm_${Date.now()}`,
        ...data,
        isArchived: false,
    };
    placeholderAdministrativeStaff.push(newStaff);
    await persistToFirestore(['administrativeStaff']);
    return newStaff;
};

// --- Drivers ---

const onDriversUpdate = (callback: (drivers: Driver[]) => void): (() => void) => {
    callback([...placeholderDrivers]);
    return () => {};
};

const saveDriver = async (data: DriverFormValues, existingId?: string): Promise<Driver> => {
    if (existingId) {
        const index = placeholderDrivers.findIndex(d => d.id === existingId);
        if (index > -1) {
            placeholderDrivers[index] = { ...placeholderDrivers[index], ...data };
            await persistToFirestore(['drivers']);
            return placeholderDrivers[index];
        }
        throw new Error("Driver not found");
    } else {
        const newDriver: Driver = { id: `drv_${Date.now()}`, ...data, documents: {} };
        placeholderDrivers.push(newDriver);
        await persistToFirestore(['drivers']);
        return newDriver;
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
