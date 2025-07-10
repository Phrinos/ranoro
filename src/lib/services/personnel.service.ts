
import type { Technician, AdministrativeStaff, Driver } from "@/types";
import { placeholderTechnicians, placeholderAdministrativeStaff, placeholderDrivers, persistToFirestore } from "@/lib/placeholder-data";
import type { TechnicianFormValues } from "@/app/(app)/tecnicos/components/technician-form";
import type { AdministrativeStaffFormValues } from "@/app/(app)/administrativos/components/administrative-staff-form";
import type { DriverFormValues } from "@/app/(app)/conductores/components/driver-form";

// --- Technicians ---

const getTechnicians = async (): Promise<Technician[]> => {
    return [...placeholderTechnicians];
};

const getTechnicianById = async (id: string): Promise<Technician | undefined> => {
    return placeholderTechnicians.find(t => t.id === id);
};

const addTechnician = async (data: TechnicianFormValues): Promise<Technician> => {
    const newTechnician: Technician = {
        id: `T_${Date.now().toString(36)}`, 
        ...data,
        hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
        monthlySalary: Number(data.monthlySalary) || undefined,
        commissionRate: data.commissionRate ? Number(data.commissionRate) : undefined,
        standardHoursPerDay: data.standardHoursPerDay ? Number(data.standardHoursPerDay) : 8,
        isArchived: false,
    };
    placeholderTechnicians.push(newTechnician);
    await persistToFirestore(['technicians']);
    return newTechnician;
};

// --- Administrative Staff ---

const getAdminStaff = async (): Promise<AdministrativeStaff[]> => {
    return [...placeholderAdministrativeStaff];
};

const addAdminStaff = async (data: AdministrativeStaffFormValues): Promise<AdministrativeStaff> => {
    const newStaffMember: AdministrativeStaff = {
        id: `ADM_${Date.now().toString(36)}`, 
        ...data,
        hireDate: data.hireDate ? new Date(data.hireDate).toISOString().split('T')[0] : undefined,
        monthlySalary: Number(data.monthlySalary) || undefined,
        commissionRate: data.commissionRate ? Number(data.commissionRate) : undefined,
        isArchived: false,
    };
    placeholderAdministrativeStaff.push(newStaffMember);
    await persistToFirestore(['administrativeStaff']);
    return newStaffMember;
};

// --- Drivers ---

const getDrivers = async (): Promise<Driver[]> => {
    return [...placeholderDrivers];
};

const saveDriver = async (data: DriverFormValues, existingId?: string): Promise<Driver> => {
    if (existingId) {
        const index = placeholderDrivers.findIndex(d => d.id === existingId);
        if (index > -1) {
            const updatedDriver = { ...placeholderDrivers[index], ...data };
            placeholderDrivers[index] = updatedDriver;
            await persistToFirestore(['drivers']);
            return updatedDriver;
        }
        throw new Error("Driver not found for update");
    } else {
        const newDriver: Driver = { id: `DRV_${Date.now().toString(36)}`, ...data, documents: {} };
        placeholderDrivers.push(newDriver);
        await persistToFirestore(['drivers']);
        return newDriver;
    }
};

export const personnelService = {
    getTechnicians,
    getTechnicianById,
    addTechnician,
    getAdminStaff,
    addAdminStaff,
    getDrivers,
    saveDriver
};
