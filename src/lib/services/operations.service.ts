

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
import type { ServiceRecord, QuoteRecord, SaleReceipt, Vehicle, CashDrawerTransaction, InitialCashBalance, InventoryItem, RentalPayment, VehicleExpense, OwnerWithdrawal, WorkshopInfo, ServiceSupply, User, PayableAccount, Supplier, PaymentMethod } from "@/types";
import { savePublicDocument } from '@/lib/public-document';
import { inventoryService } from './inventory.service';
import { nanoid } from 'nanoid';
import type { ExtractedService, ExtractedVehicle } from '@/ai/flows/data-migration-flow';
import { format, parse, isValid, startOfDay, isSameDay } from 'date-fns';
import { personnelService } from './personnel.service';
import { cleanObjectForFirestore } from '@/lib/forms';
import { logAudit, AUTH_USER_LOCALSTORAGE_KEY } from '../placeholder-data';
import { parseDate } from '@/lib/forms';
import { formatCurrency } from '../utils';


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
    }, (error) => {
        console.error("Error in onServicesUpdate listener:", error);
    });
    return unsubscribe;
};

const onServicesUpdatePromise = async (): Promise<ServiceRecord[]> => {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, "serviceRecords"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
}

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
                const userString = typeof window !== "undefined" ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
                const user = userString ? JSON.parse(userString) : { id: "system", name: "Sistema" };
                await logAudit( "Editar", `Se añadieron insumos a un servicio ya entregado. Vehículo: ${data.vehicleIdentifier || "N/A"} (Folio: ${docId}).`, {
                  entityType: "Servicio",
                  entityId: docId,
                  userId: user.id, // Replace with actual user ID
                  userName: user.name
                } );
                await batch.commit();
            }
        }
    }


    if (!data.publicId) {
        data.publicId = nanoid(12);
    }
    
    // Automatically set delivery date if status is 'Entregado' and it's not set
    if (data.status === 'Entregado' && !data.deliveryDateTime) {
      data.deliveryDateTime = new Date().toISOString();
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
    
    const dataToUpdate = {
        ...paymentAndNextServiceDetails,
        status: 'Entregado' as const, // Ensure status is correctly typed
        deliveryDateTime: new Date().toISOString(),
    };

    batch.update(serviceRef, cleanObjectForFirestore(dataToUpdate));
    
    if (service.publicId) {
        const publicDocRef = doc(db, 'publicServices', service.publicId);
        batch.update(publicDocRef, cleanObjectForFirestore(dataToUpdate));
    }

    if (service.vehicleId) {
        const vehicleRef = doc(db, 'vehicles', service.vehicleId);
        const vehicleUpdatePayload: any = {
            lastServiceDate: new Date().toISOString(),
            mileage: service.mileage, 
        };
        if (dataToUpdate.nextServiceInfo) {
            vehicleUpdatePayload.nextServiceInfo = dataToUpdate.nextServiceInfo;
        }
        batch.update(vehicleRef, cleanObjectForFirestore(vehicleUpdatePayload));
    }

    // Deduct inventory
    const allSupplies = (service.serviceItems || []).flatMap(item => item.suppliesUsed || []);
    if (allSupplies.length > 0) {
        const inventoryItems = await inventoryService.onItemsUpdatePromise();
        const inventoryMap = new Map(inventoryItems.map(item => [item.id, item]));

        for (const supply of allSupplies) {
            if (supply.supplyId && !supply.isService) {
                const item = inventoryMap.get(supply.supplyId);
                if (item) { // Only process if item exists in inventory
                    const itemRef = doc(db, "inventory", supply.supplyId);
                    const newQuantity = Math.max(0, item.quantity - supply.quantity);
                    batch.update(itemRef, { quantity: newQuantity });
                }
            }
        }
    }
    
    // Add cash transaction if paid in cash
    if (dataToUpdate.paymentMethod?.includes('Efectivo')) {
        const cashTransactionRef = doc(collection(db, "cashDrawerTransactions"));
        batch.set(cashTransactionRef, {
            date: new Date().toISOString(),
            type: 'Entrada',
            amount: dataToUpdate.amountInCash || service.totalCost, // Use split amount if available
            concept: `Servicio #${service.id.slice(0, 6)} - ${service.vehicleIdentifier || ''}`,
            userId: 'system',
            userName: dataToUpdate.serviceAdvisorName || 'Sistema',
            relatedType: 'Servicio',
            relatedId: service.id,
        });
    }
};

const saveMigratedServices = async (services: ExtractedService[], vehicles: ExtractedVehicle[]): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    
    const batch = writeBatch(db);

    // First, create the new vehicles to get their IDs
    for (const vehicle of vehicles) {
        const newVehicleRef = doc(collection(db, 'vehicles'));
        batch.set(newVehicleRef, cleanObjectForFirestore(vehicle));
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
            paymentMethod: 'Efectivo',
            serviceItems: [{ id: 'migrated-item', name: service.description, price: service.totalCost, suppliesUsed: [] }],
        };
        batch.set(newServiceRef, cleanObjectForFirestore(serviceRecord));
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
    }, (error) => {
        console.error("Error in onSalesUpdate listener:", error);
    });
    return unsubscribe;
};

const onSalesUpdatePromise = async (): Promise<SaleReceipt[]> => {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, "sales"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SaleReceipt));
}

const registerSale = async (saleId: string, saleData: Omit<SaleReceipt, 'id' | 'saleDate' | 'subTotal' | 'tax' | 'totalAmount' | 'status'>, inventoryItems: InventoryItem[], batch: ReturnType<typeof writeBatch>): Promise<void> => {
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
    
    const newSaleRef = doc(db, "sales", saleId);
    batch.set(newSaleRef, cleanObjectForFirestore(newSale));

    saleData.items.forEach(soldItem => {
        const inventoryItem = inventoryItems.find(invItem => invItem.id === soldItem.inventoryItemId);
        if (inventoryItem && !inventoryItem.isService) {
            const itemRef = doc(db, "inventory", soldItem.inventoryItemId);
            batch.update(itemRef, { quantity: inventoryItem.quantity - soldItem.quantity });
        }
    });
    
    if (newSale.paymentMethod?.includes('Efectivo')) {
        const cashTransactionRef = doc(collection(db, "cashDrawerTransactions"));
        batch.set(cashTransactionRef, {
            date: new Date().toISOString(),
            type: 'Entrada',
            amount: newSale.amountInCash || totalAmount, // Use split amount if available
            concept: `Venta POS #${saleId.slice(0, 6)}`,
            userId: 'system',
            userName: 'Sistema',
            relatedType: 'Venta',
            relatedId: saleId,
        });
    }
};

const registerPurchase = async (data: any): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const batch = writeBatch(db);
    const suppliers = await inventoryService.onSuppliersUpdatePromise();
    const inventoryItems = await inventoryService.onItemsUpdatePromise();
    
    // 1. Update supplier debt if payment method is 'Credito'
    if (data.paymentMethod === 'Crédito') {
      const accountRef = doc(collection(db, 'payableAccounts'));
      const newAccount: Omit<PayableAccount, 'id'> = {
        supplierId: data.supplierId,
        supplierName: suppliers.find(s => s.id === data.supplierId)?.name || 'Desconocido',
        invoiceId: data.invoiceId,
        invoiceDate: new Date().toISOString(),
        dueDate: data.dueDate.toISOString(),
        totalAmount: data.invoiceTotal,
        paidAmount: 0,
        status: 'Pendiente'
      };
      batch.set(accountRef, cleanObjectForFirestore(newAccount));
      
      const supplierRef = doc(db, "suppliers", data.supplierId);
      const supplier = suppliers.find(s => s.id === data.supplierId);
      if (supplier) {
        batch.update(supplierRef, { debtAmount: (supplier.debtAmount || 0) + data.invoiceTotal });
      }
    } else if (data.paymentMethod === 'Efectivo') {
        const supplierName = suppliers.find(s => s.id === data.supplierId)?.name || 'desconocido';
        const newTransaction = {
          date: new Date().toISOString(),
          type: 'Salida',
          amount: data.invoiceTotal,
          concept: `Compra a ${supplierName} (Factura: ${data.invoiceId || 'N/A'})`,
          userId: 'system', // TODO: Get current user
          userName: 'Sistema',
          relatedType: 'Compra' as const,
          relatedId: data.supplierId,
        };
        batch.set(doc(collection(db, "cashDrawerTransactions")), cleanObjectForFirestore(newTransaction));
    }
    
    // 2. Update inventory items stock and cost
    data.items.forEach((purchasedItem: any) => {
      const itemRef = doc(db, "inventory", purchasedItem.inventoryItemId);
      const inventoryItem = inventoryItems.find(i => i.id === purchasedItem.inventoryItemId);
      if (inventoryItem) {
        batch.update(itemRef, {
          quantity: inventoryItem.quantity + purchasedItem.quantity,
          unitPrice: purchasedItem.unitPrice
        });
      }
    });
    
    // 3. Log audit
    const supplierName = suppliers.find(s => s.id === data.supplierId)?.name || 'desconocido';
    const userString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
    const user = userString ? JSON.parse(userString) : { id: 'system', name: 'Sistema' };
    const auditLog = {
      actionType: 'Registrar',
      description: `Registró una compra al proveedor "${supplierName}" por ${formatCurrency(data.invoiceTotal)}.`,
      entityType: 'Compra',
      entityId: data.supplierId,
      userId: user.id,
      userName: user.name,
      date: new Date().toISOString(),
    };
    batch.set(doc(collection(db, 'auditLogs')), auditLog);
    
    // 4. Commit batch
    await batch.commit();
}


// --- Cash Drawer ---
const onCashTransactionsUpdate = (callback: (transactions: CashDrawerTransaction[]) => void): (() => void) => {
    if(!db) return () => {};
    const q = query(collection(db, "cashDrawerTransactions"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        callback(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CashDrawerTransaction)));
    }, (error) => {
        console.error("Error in onCashTransactionsUpdate listener:", error);
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

const deleteCashTransaction = async (transactionId: string): Promise<void> => {
    if (!db) throw new Error("Database not connected");
    const docRef = doc(db, "cashDrawerTransactions", transactionId);
    
    // Log before deleting
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const userString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
      const user = userString ? JSON.parse(userString) : { id: 'system', name: 'Sistema' };
      
      await logAudit('Eliminar', `Se eliminó la transacción de caja manual: "${data.concept}" por ${formatCurrency(data.amount)}.`, {
        entityType: 'Transacción de Caja', 
        entityId: transactionId,
        userId: user.id,
        userName: user.name,
      });
    }

    await deleteDoc(docRef);
};


const onInitialCashBalanceUpdate = (callback: (balance: InitialCashBalance | null) => void): (() => void) => {
    if(!db) return () => {};
    const todayStr = format(startOfDay(new Date()), 'yyyy-MM-dd');
    const docRef = doc(db, "initialCashBalances", todayStr);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        callback(docSnap.exists() ? docSnap.data() as InitialCashBalance : null);
    }, (error) => {
        console.error("Error in onInitialCashBalanceUpdate listener:", error);
    });
    return unsubscribe;
};

const setInitialCashBalance = async (balance: InitialCashBalance): Promise<void> => {
    if (!db) throw new Error("Database not connected");
    const docId = format(parseDate(balance.date)!, 'yyyy-MM-dd');
    const docRef = doc(db, "initialCashBalances", docId);
    await setDoc(docRef, balance);
};


// --- Rental / Fleet Operations ---
const onRentalPaymentsUpdate = (callback: (payments: RentalPayment[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "rentalPayments"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        callback(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalPayment)));
    }, (error) => {
        console.error("Error in onRentalPaymentsUpdate listener:", error);
    });
    return unsubscribe;
};

const onRentalPaymentsUpdatePromise = async (): Promise<RentalPayment[]> => {
    if (!db) return [];
    const snapshot = await getDocs(collection(db, "rentalPayments"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentalPayment));
}

const addRentalPayment = async (driverId: string, amount: number, paymentMethod: PaymentMethod, note: string | undefined, mileage?: number): Promise<RentalPayment> => {
    if (!db) throw new Error("Database not initialized.");
    const driver = await personnelService.getDriverById(driverId);
    if (!driver) throw new Error("Driver not found.");
    const vehicle = await inventoryService.getVehicleById(driver.assignedVehicleId || '');
    if (!vehicle) throw new Error("Assigned vehicle not found.");
    
    const authUserString = typeof window !== 'undefined' ? localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY) : null;
    const user = authUserString ? JSON.parse(authUserString) as User : null;
    
    const newPayment: Omit<RentalPayment, 'id'> = {
        driverId: driver.id,
        driverName: driver.name,
        vehicleLicensePlate: vehicle.licensePlate,
        paymentDate: new Date().toISOString(),
        amount: amount,
        daysCovered: amount / (vehicle.dailyRentalCost || 1),
        paymentMethod: paymentMethod,
        note: note,
        registeredBy: user?.name || 'Sistema',
    };
    
    const batch = writeBatch(db);
    const newPaymentRef = doc(collection(db, "rentalPayments"));
    batch.set(newPaymentRef, cleanObjectForFirestore(newPayment));

    if (mileage !== undefined) {
        const vehicleRef = doc(db, "vehicles", vehicle.id);
        batch.update(vehicleRef, { currentMileage: mileage, lastMileageUpdate: new Date().toISOString() });
    }
    
    await batch.commit();
    return { id: newPaymentRef.id, ...newPayment };
};

const updateRentalPayment = async (paymentId: string, data: Partial<RentalPayment>): Promise<void> => {
    if (!db) throw new Error("Database not initialized.");
    const paymentRef = doc(db, "rentalPayments", paymentId);
    await updateDoc(paymentRef, cleanObjectForFirestore(data));
};


const onVehicleExpensesUpdate = (callback: (expenses: VehicleExpense[]) => void): (() => void) => {
    if (!db) return () => {};
    const q = query(collection(db, "vehicleExpenses"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleExpense)));
    }, (error) => {
        console.error("Error in onVehicleExpensesUpdate listener:", error);
    });
    return unsubscribe;
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
    const docRef = await addDoc(collection(db, 'vehicleExpenses'), cleanObjectForFirestore(newExpense));
    return { id: docRef.id, ...newExpense };
};

const onOwnerWithdrawalsUpdate = (callback: (withdrawals: OwnerWithdrawal[]) => void): (() => void) => {
  if (!db) return () => {};
  const q = query(collection(db, "ownerWithdrawals"));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OwnerWithdrawal)));
  }, (error) => {
      console.error("Error in onOwnerWithdrawalsUpdate listener:", error);
  });
  return unsubscribe;
};

const addOwnerWithdrawal = async (data: Omit<OwnerWithdrawal, 'id' | 'date'>): Promise<OwnerWithdrawal> => {
    if (!db) throw new Error("Database not initialized.");
    const newWithdrawal = { ...data, date: new Date().toISOString() };
    const docRef = await addDoc(collection(db, 'ownerWithdrawals'), cleanObjectForFirestore(newWithdrawal));
    return { id: docRef.id, ...newWithdrawal };
};

const getServicesForVehicle = async (vehicleId: string): Promise<ServiceRecord[]> => {
  if (!db) return [];
  const q = query(collection(db, "serviceRecords"), where("vehicleId", "==", vehicleId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
};

const registerPayableAccountPayment = async (
  accountId: string, 
  paymentAmount: number, 
  paymentMethod: string, 
  paymentNote?: string,
  user?: User | null
): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");

  const accountRef = doc(db, 'payableAccounts', accountId);
  const accountDoc = await getDoc(accountRef);
  if (!accountDoc.exists()) throw new Error("Account payable not found");
  const accountData = accountDoc.data() as PayableAccount;
  
  const supplierRef = doc(db, 'suppliers', accountData.supplierId);
  const supplierDoc = await getDoc(supplierRef);
  if (!supplierDoc.exists()) throw new Error("Supplier not found");
  const supplierData = supplierDoc.data() as Supplier;

  const batch = writeBatch(db);

  // Update account payable
  const newPaidAmount = accountData.paidAmount + paymentAmount;
  const newStatus: PayableAccount['status'] = newPaidAmount >= accountData.totalAmount ? 'Pagado' : 'Pagado Parcialmente';
  batch.update(accountRef, { paidAmount: newPaidAmount, status: newStatus });

  // Update supplier total debt
  const newDebt = (supplierData.debtAmount || 0) - paymentAmount;
  batch.update(supplierRef, { debtAmount: Math.max(0, newDebt) });
  
  // Log cash transaction if paid in cash
  if (paymentMethod === 'Efectivo') {
      const cashTransactionRef = doc(collection(db, "cashDrawerTransactions"));
      batch.set(cashTransactionRef, {
        date: new Date().toISOString(),
        type: 'Salida',
        amount: paymentAmount,
        concept: `Pago a proveedor ${supplierData.name} (Fact: ${accountData.invoiceId})`,
        userId: user?.id || 'system',
        userName: user?.name || 'Sistema',
        relatedType: 'Compra',
        relatedId: accountId,
      });
  }
  
  // Log audit
  const auditLogRef = doc(collection(db, "auditLogs"));
  batch.set(auditLogRef, {
      actionType: 'Pagar',
      description: `Se registró un pago de ${formatCurrency(paymentAmount)} a la factura ${accountData.invoiceId} del proveedor ${supplierData.name}.`,
      entityType: 'Cuentas Por Pagar',
      entityId: accountId,
      userId: user?.id || 'system',
      userName: user?.name || 'Sistema',
      date: new Date().toISOString(),
  });

  await batch.commit();
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
    onSalesUpdate,
    onSalesUpdatePromise,
    registerSale,
    registerPurchase,
    onCashTransactionsUpdate,
    addCashTransaction,
    deleteCashTransaction,
    onInitialCashBalanceUpdate,
    setInitialCashBalance,
    onRentalPaymentsUpdate,
    onRentalPaymentsUpdatePromise,
    addRentalPayment,
    updateRentalPayment,
    onVehicleExpensesUpdate,
    onVehicleExpensesUpdatePromise,
    addVehicleExpense,
    onOwnerWithdrawalsUpdate,
    addOwnerWithdrawal,
    registerPayableAccountPayment,
};
