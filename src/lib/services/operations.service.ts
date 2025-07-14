

import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  query,
  where,
  writeBatch,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord, QuoteRecord, SaleReceipt, Vehicle, CashDrawerTransaction, InitialCashBalance, InventoryItem, RentalPayment, VehicleExpense, OwnerWithdrawal, WorkshopInfo, ServiceSupply } from "@/types";
import { savePublicDocument } from '@/lib/public-document';
import { inventoryService } from './inventory.service';
import { nanoid } from 'nanoid';
import type { ExtractedService, ExtractedVehicle } from '@/ai/flows/data-migration-flow';
import { format, parse, isValid, startOfDay, isSameDay } from 'date-fns';
import { personnelService } from './personnel.service';
import { cleanObjectForFirestore } from '@/lib/forms';
import { logAudit } from '../placeholder-data';


// --- Services ---

const onServicesUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
    if(!db) return () => {};
    const q = query(collection(db, "serviceRecords"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const services: ServiceRecord[] = [];
        querySnapshot.forEach((doc) => {
            services.push({ id: doc.id, ...doc.data() } as ServiceRecord);
        });
        callback(services);
    });
    return unsubscribe;
};

const onServicesUpdatePromise = async (): Promise<ServiceRecord[]> => {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, "serviceRecords"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
}

const getQuoteById = async (id: string): Promise<QuoteRecord | null> => {
    if (!db) throw new Error("Database not initialized.");
    const docRef = doc(db, 'serviceRecords', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'Cotizacion') {
            return { id: docSnap.id, ...data } as QuoteRecord;
        }
    }
    return null;
};

const saveService = async (data: Partial<ServiceRecord>): Promise<ServiceRecord> => {
    if (!db) throw new Error("Database not initialized.");
    
    const docId = data.id || nanoid();
    const docRef = doc(db, 'serviceRecords', docId);

    // If it's an existing record and it's already 'Entregado'
    if (data.id && data.status === 'Entregado') {
        const originalDocSnap = await getDoc(docRef);
        if (originalDocSnap.exists()) {
            const originalData = originalDocSnap.data() as ServiceRecord;
            const originalSupplies = (originalData.serviceItems || []).flatMap(si => si.suppliesUsed || []);
            const newSupplies = (data.serviceItems || []).flatMap(si => si.suppliesUsed || []);

            const supplyChanges = new Map<string, number>();
            
            // Count original supplies
            originalSupplies.forEach(s => {
                supplyChanges.set(s.supplyId, (supplyChanges.get(s.supplyId) || 0) + s.quantity);
            });
            // Subtract new supplies
            newSupplies.forEach(s => {
                supplyChanges.set(s.supplyId, (supplyChanges.get(s.supplyId) || 0) - s.quantity);
            });
            
            const batch = writeBatch(db);
            let inventoryUpdated = false;

            for (const [supplyId, quantityChange] of supplyChanges.entries()) {
                if (quantityChange !== 0) { // If there's a net change
                    const invItemRef = doc(db, 'inventory', supplyId);
                    const invItemSnap = await getDoc(invItemRef);
                    if (invItemSnap.exists()) {
                        const invItem = invItemSnap.data() as InventoryItem;
                        if (!invItem.isService) {
                            // a negative change means we ADDED items, so we need to DEDUCT from stock
                            const newQuantity = invItem.quantity - (-quantityChange);
                            batch.update(invItemRef, { quantity: newQuantity });
                            inventoryUpdated = true;
                        }
                    }
                }
            }

            if (inventoryUpdated) {
                await logAudit('Editar', `Se añadieron insumos a un servicio ya entregado. Vehículo: ${data.vehicleIdentifier || 'N/A'} (Folio: ${docId}).`, {
                    entityType: 'Servicio',
                    entityId: docId,
                    userId: 'system', // Replace with actual user ID
                    userName: 'Sistema',
                });
                await batch.commit();
            }
        }
    }


    if (!data.publicId) {
        data.publicId = nanoid(12);
    }
    
    const fieldsToNullify: (keyof ServiceRecord)[] = ['customerSignatureReception', 'customerSignatureDelivery', 'technicianName'];
    fieldsToNullify.forEach(key => {
        if (!data[key]) {
            (data as any)[key] = null;
        }
    });
    
    const cleanedData = cleanObjectForFirestore({ ...data, id: docId });

    await setDoc(docRef, cleanedData, { merge: true });
    
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
      throw new Error("Failed to save or retrieve the service document.");
    }

    const finalData = { id: newDocSnap.id, ...newDocSnap.data() } as ServiceRecord;

    const vehicle = finalData.vehicleId ? await inventoryService.getVehicleById(finalData.vehicleId) : undefined;
    const workshopInfoString = typeof window !== 'undefined' ? localStorage.getItem('workshopTicketInfo') : null;
    const workshopInfo = workshopInfoString ? JSON.parse(workshopInfoString) as WorkshopInfo : undefined;

    savePublicDocument('service', finalData, vehicle, workshopInfo);
    
    return finalData;
};


const updateService = async (serviceId: string, data: Partial<ServiceRecord>): Promise<ServiceRecord> => {
    return saveService({ ...data, id: serviceId });
};

const addService = async (data: Partial<ServiceRecord>): Promise<ServiceRecord> => {
    const { id, ...serviceData } = data;
    return saveService(serviceData);
};


const cancelService = async (serviceId: string, reason: string): Promise<void> => {
    if(!db) throw new Error("Database not connected");
    const serviceRef = doc(db, "serviceRecords", serviceId);
    const data = { status: 'Cancelado', cancellationReason: reason };
    await updateDoc(serviceRef, data);
    
    const serviceDoc = await getDoc(serviceRef);
    const publicId = serviceDoc.data()?.publicId;
    if (publicId) {
        await updateDoc(doc(db, 'publicServices', publicId), data);
    }
};

const deleteService = async (serviceId: string): Promise<void> => {
    if(!db) throw new Error("Database not connected");
    const serviceRef = doc(db, "serviceRecords", serviceId);
    
    const serviceDoc = await getDoc(serviceRef);
    const publicId = serviceDoc.data()?.publicId;

    await deleteDoc(serviceRef);

    if (publicId) {
        await deleteDoc(doc(db, 'publicServices', publicId));
    }
};


const completeService = async (service: ServiceRecord, paymentAndNextServiceDetails: Partial<ServiceRecord>, batch: ReturnType<typeof writeBatch>): Promise<void> => {
    const serviceRef = doc(db, "serviceRecords", service.id);
    
    const updatedServiceData = {
      status: 'Entregado',
      deliveryDateTime: new Date().toISOString(),
      ...paymentAndNextServiceDetails,
    };
    
    batch.update(serviceRef, cleanObjectForFirestore(updatedServiceData));
    
    if (service.publicId) {
        const publicDocRef = doc(db, 'publicServices', service.publicId);
        batch.update(publicDocRef, cleanObjectForFirestore(updatedServiceData));
    }

    if (service.vehicleId && paymentAndNextServiceDetails.nextServiceInfo) {
      const vehicleRef = doc(db, 'vehicles', service.vehicleId);
      batch.update(vehicleRef, { 
        nextServiceInfo: paymentAndNextServiceDetails.nextServiceInfo,
        lastServiceDate: new Date().toISOString(),
       });
    } else if (service.vehicleId) {
      const vehicleRef = doc(db, 'vehicles', service.vehicleId);
      batch.update(vehicleRef, { lastServiceDate: new Date().toISOString() });
    }

    // Deduct inventory
    const allSupplies = service.serviceItems.flatMap(item => item.suppliesUsed || []);
    const inventoryUpdates = new Map<string, number>();

    allSupplies.forEach(supply => {
        if (!supply.isService) {
            inventoryUpdates.set(supply.supplyId, (inventoryUpdates.get(supply.supplyId) || 0) + supply.quantity);
        }
    });

    const inventoryItems = await inventoryService.onItemsUpdatePromise();

    for (const [itemId, quantityToDeduct] of inventoryUpdates.entries()) {
        const item = inventoryItems.find(inv => inv.id === itemId);
        if(item) {
            const itemRef = doc(db, "inventory", itemId);
            const newQuantity = Math.max(0, item.quantity - quantityToDeduct);
            batch.update(itemRef, { quantity: newQuantity });
        }
    }
};

const saveMigratedServices = async (services: ExtractedService[], vehicles: ExtractedVehicle[]): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    
    const batch = writeBatch(db);

    // First, create the new vehicles to get their IDs
    for (const vehicle of vehicles) {
        const newVehicleRef = doc(collection(db, 'vehicles'));
        batch.set(newVehicleRef, vehicle);
    }
    
    // Create the services, linking them to the new vehicle IDs
    for (const service of services) {
        let parsedDate: Date | null = null;
        const possibleFormats = ['M/d/yy', 'MM/dd/yy', 'M-d-yy', 'MM-dd-yy', 'yyyy-MM-dd', 'dd/MM/yyyy'];
        for (const fmt of possibleFormats) {
            const dt = parse(service.serviceDate, fmt, new Date());
            if (isValid(dt)) { parsedDate = dt; break; }
        }
        
        if (!parsedDate) continue; // Skip if date is invalid

        const newServiceRef = doc(collection(db, "serviceRecords"));
        
        const serviceRecord: Omit<ServiceRecord, 'id'|'vehicleId'> & {vehicleIdentifier: string} = {
            vehicleIdentifier: service.vehicleLicensePlate,
            serviceDate: parsedDate.toISOString(),
            description: service.description,
            totalCost: service.totalCost,
            status: 'Entregado',
            deliveryDateTime: parsedDate.toISOString(),
            subTotal: service.totalCost / 1.16,
            taxAmount: service.totalCost - (service.totalCost / 1.16),
            serviceProfit: 0,
            totalSuppliesWorkshopCost: 0,
            technicianId: 'N/A',
            serviceAdvisorId: 'system',
            serviceAdvisorName: 'Migración',
            serviceItems: [{ id: 'migrated-item', name: service.description, price: service.totalCost, suppliesUsed: [] }],
        };
        batch.set(newServiceRef, serviceRecord);
    }
    await batch.commit();
}

const saveIndividualMigratedService = async (data: {
    serviceDate: Date;
    vehicleId: string;
    description: string;
    totalCost: number;
    suppliesCost: number;
    paymentMethod: string;
}): Promise<ServiceRecord> => {
    if (!db) throw new Error("Database not initialized.");

    const vehicle = await inventoryService.getVehicleById(data.vehicleId);
    if (!vehicle) throw new Error("Vehicle not found.");

    const newService: Omit<ServiceRecord, 'id'> = {
        vehicleId: data.vehicleId,
        vehicleIdentifier: vehicle.licensePlate,
        serviceDate: data.serviceDate.toISOString(),
        description: data.description,
        totalCost: data.totalCost,
        totalSuppliesWorkshopCost: data.suppliesCost,
        serviceProfit: data.totalCost - data.suppliesCost,
        status: 'Entregado',
        deliveryDateTime: data.serviceDate.toISOString(),
        subTotal: data.totalCost / 1.16,
        taxAmount: data.totalCost - (data.totalCost / 1.16),
        technicianId: 'system',
        serviceAdvisorId: 'system',
        serviceAdvisorName: 'Migración',
        paymentMethod: data.paymentMethod as any,
        serviceItems: [{
            id: nanoid(),
            name: data.description,
            price: data.totalCost,
            suppliesUsed: [],
        }],
    };

    const docRef = await addDoc(collection(db, 'serviceRecords'), cleanObjectForFirestore(newService));

    const vehicleRef = doc(db, "vehicles", data.vehicleId);
    await updateDoc(vehicleRef, { lastServiceDate: data.serviceDate.toISOString() });
    
    return { id: docRef.id, ...newService };
};


// --- Sales ---
const onSalesUpdate = (callback: (sales: SaleReceipt[]) => void): (() => void) => {
    if(!db) return () => {};
    const q = query(collection(db, "sales"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const sales: SaleReceipt[] = [];
        querySnapshot.forEach((doc) => {
            sales.push({ id: doc.id, ...doc.data() } as SaleReceipt);
        });
        callback(sales);
    });
    return unsubscribe;
};

const onSalesUpdatePromise = async (): Promise<SaleReceipt[]> => {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, "sales"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleReceipt));
}

const registerSale = async (saleData: Omit<SaleReceipt, 'id' | 'saleDate'>, inventoryItems: InventoryItem[], batch: ReturnType<typeof writeBatch>): Promise<string> => {
    const IVA_RATE = 0.16;
    const totalAmount = saleData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const subTotal = totalAmount / (1 + IVA_RATE);
    const tax = totalAmount - subTotal;

    const newSale: Omit<SaleReceipt, 'id'> = {
      ...saleData,
      saleDate: new Date().toISOString(),
      subTotal, tax, totalAmount,
      status: 'Completado',
    };
    
    const newSaleRef = doc(collection(db, "sales"));
    batch.set(newSaleRef, newSale);

    saleData.items.forEach(soldItem => {
        const inventoryItem = inventoryItems.find(invItem => invItem.id === soldItem.inventoryItemId);
        if (inventoryItem && !inventoryItem.isService) {
            const itemRef = doc(db, "inventory", soldItem.inventoryItemId);
            batch.update(itemRef, { quantity: inventoryItem.quantity - soldItem.quantity });
        }
    });
    
    if (newSale.paymentMethod === 'Efectivo') {
        const cashTransactionRef = doc(collection(db, "cashDrawerTransactions"));
        batch.set(cashTransactionRef, {
            date: new Date().toISOString(),
            type: 'Entrada',
            amount: totalAmount,
            concept: `Venta POS #${newSaleRef.id.slice(0, 6)}`,
            userId: 'system',
            userName: 'Sistema',
        });
    }
    
    return newSaleRef.id;
};

// --- Cash Drawer ---
const onCashTransactionsUpdate = (callback: (transactions: CashDrawerTransaction[]) => void): (() => void) => {
    if(!db) return () => {};
    const q = query(collection(db, "cashDrawerTransactions"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        callback(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashDrawerTransaction)));
    });
    return unsubscribe;
};

const addCashTransaction = async (transaction: Omit<CashDrawerTransaction, 'id' | 'date'>): Promise<void> => {
    if (!db) throw new Error("Database not connected");
    await addDoc(collection(db, 'cashDrawerTransactions'), {
        ...transaction,
        date: new Date().toISOString()
    });
};

const onInitialCashBalanceUpdate = (callback: (balance: InitialCashBalance | null) => void): (() => void) => {
    if(!db) return () => {};
    const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const docRef = doc(db, "initialCashBalances", todayStr);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        callback(docSnap.exists() ? docSnap.data() as InitialCashBalance : null);
    });
    return unsubscribe;
};

const setInitialCashBalance = async (balance: InitialCashBalance): Promise<void> => {
    if (!db) throw new Error("Database not connected");
    const docId = format(parseISO(balance.date), 'yyyy-MM-dd');
    const docRef = doc(db, "initialCashBalances", docId);
    await setDoc(docRef, balance);
};


// --- Rental / Fleet Operations ---
const onRentalPaymentsUpdate = (callback: (payments: RentalPayment[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "rentalPayments"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        callback(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalPayment)));
    });
    return unsubscribe;
};

const onRentalPaymentsUpdatePromise = async (): Promise<RentalPayment[]> => {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, "rentalPayments"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalPayment));
}

const addRentalPayment = async (driverId: string, amount: number, note: string | undefined, mileage?: number): Promise<RentalPayment> => {
    if (!db) throw new Error("Database not initialized.");
    const driver = await personnelService.getDriverById(driverId);
    if (!driver) throw new Error("Driver not found.");
    const vehicle = await inventoryService.getVehicleById(driver.assignedVehicleId || '');
    if (!vehicle) throw new Error("Assigned vehicle not found.");
    
    const newPayment: Omit<RentalPayment, 'id'> = {
        driverId: driver.id,
        driverName: driver.name,
        vehicleLicensePlate: vehicle.licensePlate,
        paymentDate: new Date().toISOString(),
        amount: amount,
        daysCovered: amount / (vehicle.dailyRentalCost || 1),
        note: note,
    };
    
    const batch = writeBatch(db);
    const newPaymentRef = doc(collection(db, "rentalPayments"));
    batch.set(newPaymentRef, newPayment);

    if (mileage !== undefined) {
        const vehicleRef = doc(db, "vehicles", vehicle.id);
        batch.update(vehicleRef, { currentMileage: mileage, lastMileageUpdate: new Date().toISOString() });
    }
    
    await batch.commit();
    return { id: newPaymentRef.id, ...newPayment };
};

const onVehicleExpensesUpdatePromise = async (): Promise<VehicleExpense[]> => {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, "vehicleExpenses"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleExpense));
}

const addVehicleExpense = async (data: Omit<VehicleExpense, 'id' | 'date' | 'vehicleLicensePlate'>): Promise<VehicleExpense> => {
    if (!db) throw new Error("Database not initialized.");
    const vehicle = await inventoryService.getVehicleById(data.vehicleId);
    if (!vehicle) throw new Error("Vehicle not found");

    const newExpense: Omit<VehicleExpense, 'id'> = {
        ...data,
        vehicleLicensePlate: vehicle.licensePlate,
        date: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'vehicleExpenses'), newExpense);
    return { id: docRef.id, ...newExpense };
};

const addOwnerWithdrawal = async (data: Omit<OwnerWithdrawal, 'id' | 'date'>): Promise<OwnerWithdrawal> => {
    if (!db) throw new Error("Database not initialized.");
    const newWithdrawal = { ...data, date: new Date().toISOString() };
    const docRef = await addDoc(collection(db, 'ownerWithdrawals'), newWithdrawal);
    return { id: docRef.id, ...newWithdrawal };
};

const getServicesForVehicle = async (vehicleId: string): Promise<ServiceRecord[]> => {
  if (!db) return [];
  const q = query(collection(db, "serviceRecords"), where("vehicleId", "==", vehicleId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
};

export const operationsService = {
    onServicesUpdate,
    onServicesUpdatePromise,
    addService,
    saveService,
    updateService,
    cancelService,
    deleteService,
    completeService,
    saveMigratedServices,
    saveIndividualMigratedService,
    getServicesForVehicle,
    getQuoteById,
    onSalesUpdate,
    onSalesUpdatePromise,
    registerSale,
    onCashTransactionsUpdate,
    addCashTransaction,
    onInitialCashBalanceUpdate,
    setInitialCashBalance,
    onRentalPaymentsUpdate,
    onRentalPaymentsUpdatePromise,
    addRentalPayment,
    onVehicleExpensesUpdatePromise,
    addVehicleExpense,
    addOwnerWithdrawal,
};
