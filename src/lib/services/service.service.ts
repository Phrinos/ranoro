// src/lib/services/service.service.ts
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  writeBatch,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord, Vehicle, InventoryItem, User } from '@/types';
import { cleanObjectForFirestore, parseDate } from '../forms';
import { inventoryService } from './inventory.service';
import { adminService } from './admin.service';
import { nanoid } from 'nanoid';


const toNumber = (v: any): number =>
  typeof v === 'number'
    ? (Number.isFinite(v) ? v : 0)
    : typeof v === 'string'
      ? (Number(v.replace(/[^\d.-]/g, '')) || 0)
      : 0;

const pickTotal = (o: any): number => {
  if (!o) return 0;
  const candidates = [o.total, o.totalCost, o.Total, o.serviceTotal];
  for (const c of candidates) {
    const n = toNumber(c);
    if (n > 0) return n;
  }
  return 0;
};

const buildVehicleIdentifier = (v: any | null | undefined) => {
  if (!v) return undefined;
  const parts = [v.make, v.model].filter(Boolean).join(' ');
  const year = v.year ? ` (${v.year})` : '';
  const plate = v.licensePlate ? ` ${v.licensePlate}` : '';
  const out = `${parts}${year}${plate}`.trim();
  return out || undefined;
};

// --- DENORMALIZATION: Central function to enrich service data ---
async function denormalizeService(
  base: any, 
): Promise<any> {
  const serviceData = { ...base };

  // 1. Vehicle Denormalization
  let vehicle = serviceData.vehicle || null;
  if (!vehicle && serviceData.vehicleId) {
    vehicle = await inventoryService.getVehicleById(serviceData.vehicleId) || null;
  }
  if (vehicle) {
    serviceData.vehicleIdentifier = buildVehicleIdentifier(vehicle);
    serviceData.customerName = vehicle.ownerName || serviceData.customerName;
    serviceData.customerPhone = vehicle.ownerPhone || serviceData.customerPhone; // Denormalize phone
  }

  // 2. User (Advisor/Technician) Denormalization
  const getUser = async (id?: string, name?: string): Promise<User | null> => {
    if (id) {
        const userDoc = await adminService.getDocById('users', id);
        if (userDoc) return userDoc as User;
    }
    if (name) {
        const users = await adminService.onUsersUpdatePromise();
        const normName = name.toLowerCase().trim();
        return users.find(u => u.name.toLowerCase().trim() === normName) || null;
    }
    return null;
  };
  
  // Advisor
  const advisor = await getUser(serviceData.serviceAdvisorId, serviceData.serviceAdvisorName);
  if (advisor) {
    serviceData.serviceAdvisorId = advisor.id;
    serviceData.serviceAdvisorName = advisor.name;
    serviceData.serviceAdvisorSignatureDataUrl = advisor.signatureDataUrl || null;
  }

  // Technician
  const technician = await getUser(serviceData.technicianId, serviceData.technicianName);
  if (technician) {
      serviceData.technicianId = technician.id;
      serviceData.technicianName = technician.name;
  }

  // 3. Financial Denormalization
  serviceData.total = pickTotal(serviceData);
  
  return serviceData;
}


// --- PUBLIC DATA: Structure for the public-facing document ---
function buildPublicData(svc: any) {
    return {
      serviceId: svc.id, // Reference to the main service document
      folio: svc.folio || null,
      status: svc.status || null,
      subStatus: svc.subStatus ?? null,
      customerName: svc.customerName || null,
      serviceAdvisorName: svc.serviceAdvisorName || null,
      vehicleId: svc.vehicleId || null,
      vehicleIdentifier: svc.vehicleIdentifier || null,
      receptionDateTime: svc.receptionDateTime || null,
      deliveryDateTime: svc.deliveryDateTime || null,
      appointmentDateTime: svc.appointmentDateTime || null,
      appointmentStatus: svc.appointmentStatus || null,
      serviceItems: Array.isArray(svc.serviceItems) ? svc.serviceItems.map((item: any) => ({ name: item.name, sellingPrice: item.sellingPrice })) : [],
      total: toNumber(svc.total),
      recommendations: svc.recommendations || null,
      customerSignatureReception: svc.customerSignatureReception || null,
      customerSignatureDelivery: svc.customerSignatureDelivery || null,
      isPublic: true,
      updatedAt: serverTimestamp(),
      createdAt: svc.createdAt || serverTimestamp(),
    };
}


const onServicesUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'serviceRecords'), orderBy("serviceDate", "desc"));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceRecord)));
  });
};

const onServicesUpdatePromise = async (): Promise<ServiceRecord[]> => {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, 'serviceRecords')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceRecord));
};

const onServicesForVehicleUpdate = (
  vehicleId: string,
  callback: (services: ServiceRecord[]) => void
): (() => void) => {
  if (!db || !vehicleId) return () => {};
  const q = query(
    collection(db, "serviceRecords"),
    where("vehicleId", "==", vehicleId),
    orderBy("serviceDate", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceRecord)));
  }, (error) => {
    console.error(`Error listening to services for vehicle ${vehicleId}:`, error.message);
    callback([]);
  });
};


const getDocById = async (collectionName: 'serviceRecords', id: string): Promise<any> => {
  if (!db) throw new Error('Database not initialized.');
  const ref = doc(db, collectionName, id);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as any) : null;
};

const saveService = async (data: ServiceRecord): Promise<ServiceRecord> => {
    if (!db) throw new Error('Database not initialized.');
  
    const isNew = !data.id;
    const serviceId = isNew ? doc(collection(db, 'serviceRecords')).id : (data.id as string);
  
    const serviceData: any = {
      ...data,
      id: serviceId,
      publicId: data.publicId || nanoid(10), // Ensure publicId exists
      updatedAt: serverTimestamp(),
      createdAt: (data as any).createdAt?.toDate ? (data as any).createdAt : (data as any).createdAt || serverTimestamp(),
    };
    
    const denormalizedData = await denormalizeService(serviceData);
  
    const serviceRef = doc(db, 'serviceRecords', serviceId);
    const publicRef = doc(db, 'publicServices', denormalizedData.publicId);
  
    const batch = writeBatch(db);
    batch.set(serviceRef, cleanObjectForFirestore(denormalizedData), { merge: true });
    batch.set(publicRef, cleanObjectForFirestore(buildPublicData(denormalizedData)), { merge: true });
    
    // If status is 'Entregado', update lastServiceDate on the vehicle
    if (denormalizedData.status === 'Entregado' && denormalizedData.vehicleId) {
      const vehicleRef = doc(db, 'vehicles', denormalizedData.vehicleId);
      batch.update(vehicleRef, { lastServiceDate: denormalizedData.deliveryDateTime || new Date().toISOString() });
    }

    await batch.commit();
  
    const saved = await getDoc(serviceRef);
    if (!saved.exists()) throw new Error('Failed to save or retrieve the document.');
    return { ...saved.data(), id: serviceId } as ServiceRecord;
};

const updateService = async (id: string, data: Partial<ServiceRecord>) => {
    if (!db) throw new Error('Database not initialized.');
    
    const serviceRef = doc(db, 'serviceRecords', id);
    const serviceSnap = await getDoc(serviceRef);
    if (!serviceSnap.exists()) throw new Error("Service to update not found.");

    const batch = writeBatch(db);
    batch.update(serviceRef, data);
    
    // Also update the public document if it exists
    const publicId = serviceSnap.data().publicId || id;
    if (publicId) {
      const publicRef = doc(db, 'publicServices', publicId);
      batch.update(publicRef, data);
    }
    
    await batch.commit();
};

const completeService = async (service: ServiceRecord, paymentDetails: any, batch?: WriteBatch) => {
    const manageBatch = !batch;
    const workBatch = batch || writeBatch(db);

    const serviceRef = doc(db, 'serviceRecords', service.id);
    const publicServiceRef = doc(db, 'publicServices', (service as any).publicId || service.id);
    
    const suppliesToDiscount = (service.serviceItems || [])
        .flatMap((item: any) => item.suppliesUsed || [])
        .filter((supply: any) => !supply.isService && supply.supplyId && supply.quantity > 0);

    const itemRefs = suppliesToDiscount.map((item: any) => doc(db, 'inventory', item.supplyId));
    
    // Fetch docs outside the batch write loop if we're not in a transaction
    if (manageBatch) {
      const itemDocs = await Promise.all(itemRefs.map(ref => getDoc(ref)));
      itemDocs.forEach((itemDoc, index) => {
          if (itemDoc.exists()) {
              const currentStock = itemDoc.data().quantity || 0;
              const newStock = currentStock - suppliesToDiscount[index].quantity;
              workBatch.update(itemDoc.ref, { quantity: newStock });
          }
      });
    }

    const cleanedNextServiceInfo = cleanObjectForFirestore(paymentDetails.nextServiceInfo);
    const deliveryTime = new Date().toISOString();

    const updateData = {
        status: 'Entregado' as const,
        payments: paymentDetails.payments,
        deliveryDateTime: deliveryTime,
        updatedAt: serverTimestamp(),
        nextServiceInfo: cleanedNextServiceInfo,
    };
    
    workBatch.update(serviceRef, updateData);
    workBatch.update(publicServiceRef, {
        status: 'Entregado',
        deliveryDateTime: deliveryTime,
        payments: paymentDetails.payments,
        updatedAt: serverTimestamp(),
    });

    // Update last service date on vehicle
    if (service.vehicleId) {
        const vehicleRef = doc(db, 'vehicles', service.vehicleId);
        workBatch.update(vehicleRef, { lastServiceDate: deliveryTime });
    }
    
    for (const payment of paymentDetails.payments) {
        if (payment.method === 'Efectivo' && payment.amount > 0) {
            const cashTransactionRef = doc(collection(db, 'cashDrawerTransactions'));
            workBatch.set(cashTransactionRef, {
                date: deliveryTime,
                type: 'Entrada',
                amount: payment.amount,
                concept: `Pago de servicio #${(service as any).folio || service.id.slice(-6)}`,
                userId: service.serviceAdvisorId,
                userName: service.serviceAdvisorName,
                relatedType: 'Servicio',
                relatedId: service.id,
            });
        }
    }
    
    if (manageBatch) {
        await workBatch.commit();
    }
};

const deleteService = async (id: string): Promise<void> => {
  if (!db) throw new Error("Database not initialized.");
  const batch = writeBatch(db);
  const serviceRef = doc(db, 'serviceRecords', id);
  const publicRef = doc(db, 'publicServices', id);
  batch.delete(serviceRef);
  batch.delete(publicRef);
  await batch.commit();
}

const saveMigratedServices = async (services: ServiceRecord[], vehicles: Vehicle[]): Promise<void> => {
    if (!db) throw new Error('Database not initialized.');

    const batch = writeBatch(db);
    
    for (const vehicle of vehicles) {
        const vehicleRef = doc(db, 'vehicles', vehicle.id);
        batch.set(vehicleRef, cleanObjectForFirestore(vehicle));
    }

    for (const service of services) {
        const serviceRef = doc(db, 'serviceRecords', service.id);
        const denormalizedData = await denormalizeService(service);
        batch.set(serviceRef, cleanObjectForFirestore(denormalizedData));
        
        const publicId = (service as any).publicId || service.id;
        const publicRef = doc(db, 'publicServices', publicId);
        batch.set(publicRef, cleanObjectForFirestore(buildPublicData(denormalizedData)));
    }

    await batch.commit();
};

const cancelService = async (serviceId: string, reason: string): Promise<void> => {
    const data = { status: 'Cancelado', cancellationReason: reason, cancellationTimestamp: new Date().toISOString() };
    await updateService(serviceId, data);
};


export const serviceService = {
  onServicesUpdate,
  onServicesUpdatePromise,
  onServicesForVehicleUpdate,
  getDocById,
  saveService,
  updateService,
  completeService,
  deleteService,
  saveMigratedServices,
  cancelService,
};
