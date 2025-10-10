// src/lib/services/service.service.ts
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  writeBatch, // Importar writeBatch
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord, User } from '@/types';
import { cleanObjectForFirestore } from '../forms';
import { inventoryService } from './inventory.service';
import { adminService } from './admin.service';

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
    serviceData.vehicleIdentifier = buildVehicleIdentifier(vehicle);
    serviceData.customerName = vehicle.ownerName || serviceData.customerName;
  }

  try {
    const users = await adminService.onUsersUpdatePromise();
    const byId = (uid: any) => users.find((u: any) => String(u.id) === String(uid));
    const norm = (s?: string) => (s ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();
    const byName = (name?: string) => users.find((u: any) => norm(u.name) === norm(name));

    let advisor = serviceData.serviceAdvisorId ? byId(serviceData.serviceAdvisorId) : null;
    if (!advisor && serviceData.serviceAdvisorName) {
      advisor = byName(serviceData.serviceAdvisorName);
      if (advisor) serviceData.serviceAdvisorId = advisor.id;
    }

    if (advisor) {
      serviceData.serviceAdvisorName = advisor.name || serviceData.serviceAdvisorName || null;
      serviceData.serviceAdvisorSignatureDataUrl = advisor.signatureDataUrl || serviceData.serviceAdvisorSignatureDataUrl || null;
    }
  } catch { /* noop */ }

  serviceData.total = pickTotal(serviceData);
  
  return serviceData;
}

function buildPublicData(svc: any) {
    return {
      folio: svc.folio || null,
      status: svc.status || null,
      subStatus: svc.subStatus ?? null,
      customerName: svc.customerName || null,
      serviceAdvisorName: svc.serviceAdvisorName || null,
      serviceAdvisorSignatureDataUrl: svc.serviceAdvisorSignatureDataUrl || null,
      vehicleId: svc.vehicleId || null,
      vehicleIdentifier: svc.vehicleIdentifier || null,
      receptionDateTime: svc.receptionDateTime || null,
      deliveryDateTime: svc.deliveryDateTime || null,
      serviceItems: Array.isArray(svc.serviceItems) ? svc.serviceItems : [],
      total: toNumber(svc.total),
      recommendations: svc.recommendations || null,
      customerSignatureReception: svc.customerSignatureReception || null,
      isPublic: true,
      updatedAt: serverTimestamp(),
      createdAt: svc.createdAt || serverTimestamp(),
    };
}

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
      updatedAt: serverTimestamp(),
      createdAt: (data as any).createdAt?.toDate ? (data as any).createdAt : (data as any).createdAt || serverTimestamp(),
    };
    
    const denormalizedData = await denormalizeService(serviceData);
  
    const serviceRef = doc(db, 'serviceRecords', serviceId);
    const publicId = data.publicId || serviceId;
    const publicRef = doc(db, 'publicServices', publicId);
  
    const batch = writeBatch(db); // Sintaxis correcta para el cliente
    batch.set(serviceRef, cleanObjectForFirestore(denormalizedData), { merge: true });
    batch.set(publicRef, cleanObjectForFirestore(buildPublicData(denormalizedData)), { merge: true });
    await batch.commit();
  
    const saved = await getDoc(serviceRef);
    if (!saved.exists()) throw new Error('Failed to save or retrieve the document.');
    return { ...saved.data(), id: serviceId } as ServiceRecord;
};

// ... other functions like cancelService, deleteService, etc.
const updateService = async (id: string, data: Partial<ServiceRecord>) => {
    if (!db) throw new Error('Database not initialized.');
    const serviceRef = doc(db, 'serviceRecords', id);
    const batch = writeBatch(db);
    batch.update(serviceRef, data);
    await batch.commit();
};


export const serviceService = {
  onServicesUpdate,
  onServicesUpdatePromise,
  onServicesForVehicleUpdate,
  getDocById,
  saveService,
  updateService
};
