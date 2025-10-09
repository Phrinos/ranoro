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
  runTransaction, // Importar runTransaction
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord, User } from '@/types';
import { cleanObjectForFirestore } from '../forms';
import { inventoryService } from './inventory.service';
import { adminService } from './admin.service';

// --- (Helper functions like toNumber, pickTotal, etc. remain unchanged) ---
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

// ... (other helpers)

async function denormalizeService(base: any): Promise<any> {
  const serviceData = { ...base };

  let vehicle = serviceData.vehicle || null;
  if (!vehicle && serviceData.vehicleId) {
    try {
        const vehicles = await inventoryService.onVehiclesUpdatePromise();
        vehicle = vehicles.find((v: any) => v.id === serviceData.vehicleId) || null;
    } catch { /* noop */ }
  }
  if (vehicle) {
    serviceData.vehicleIdentifier = `${vehicle.make} ${vehicle.model} (${vehicle.year}) ${vehicle.licensePlate}`;
    serviceData.customerName = vehicle.ownerName || serviceData.customerName;
  }
  
  // Totals are now unified to 'total' during migration, but we keep this for safety
  serviceData.total = pickTotal(serviceData);
  
  return serviceData;
}


// ---------------------------------------------------------
// Reads / listeners
// ---------------------------------------------------------
const onServicesUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
  if (!db) return () => {};
  const q = query(collection(db, 'serviceRecords'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceRecord)));
  });
};

const onServicesUpdatePromise = async (): Promise<ServiceRecord[]> => {
  if (!db) return [];
  const snapshot = await getDocs(query(collection(db, 'serviceRecords')));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceRecord));
};

const getDocById = async (collectionName: 'serviceRecords', id: string): Promise<any> => {
  if (!db) throw new Error('Database not initialized.');
  const ref = doc(db, collectionName, id);
  const snap = await getDoc(ref);
  // Return raw data. The frontend will handle normalization for the form.
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as any) : null;
};

// ---------------------------------------------------------
// Mutations
// ---------------------------------------------------------
const saveService = async (data: ServiceRecord): Promise<ServiceRecord> => {
  if (!db) throw new Error('Database not initialized.');

  const isNew = !data.id;
  const serviceId = isNew ? doc(collection(db, 'serviceRecords')).id : (data.id as string);

  let serviceData: any = {
    ...data,
    id: serviceId,
    updatedAt: serverTimestamp(),
    createdAt: (data as any).createdAt?.toDate ? (data as any).createdAt : (data as any).createdAt || serverTimestamp(),
  };

  // Ensure total is correctly set from the form
  serviceData.total = pickTotal(serviceData);

  const serviceRef = doc(db, 'serviceRecords', serviceId);
  // Corrected syntax for runTransaction
  await runTransaction(db, async (transaction) => {
    transaction.set(serviceRef, cleanObjectForFirestore(serviceData), { merge: true });
  });

  const saved = await getDoc(serviceRef);
  if (!saved.exists()) throw new Error('Failed to save or retrieve the document.');
  return { ...saved.data(), id: serviceId } as ServiceRecord;
};


export const serviceService = {
  onServicesUpdate,
  onServicesUpdatePromise,
  getDocById,
  saveService,
  // ... other functions
};
