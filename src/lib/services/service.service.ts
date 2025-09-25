// src/lib/services/service.service.ts
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord, QuoteRecord, User } from '@/types';
import { cleanObjectForFirestore } from '../forms';
import { inventoryService } from './inventory.service';
import { adminService } from './admin.service';

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------
const toNumber = (v: any) =>
  typeof v === 'number'
    ? Number.isFinite(v) ? v : 0
    : typeof v === 'string'
      ? (Number(v.replace(/[^\d.-]/g, '')) || 0)
      : 0;

const pickTotal = (o: any): number => {
  if (!o) return 0;
  if (typeof o.total === 'number') return toNumber(o.total);
  if (typeof o.Total === 'number') return toNumber(o.Total);
  if (typeof o.totalCost === 'number') return toNumber(o.totalCost);
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

/**
 * Mezcla datos de vehículo/cliente/asesor dentro del objeto de servicio.
 * ESTA VERSIÓN SOBREESCRIBE para asegurar consistencia.
 */
async function denormalizeService(base: any): Promise<any> {
  const serviceData = { ...base };

  // Vehículo
  let vehicle = serviceData.vehicle || null;
  if (!vehicle && serviceData.vehicleId) {
    try {
      const vehicles = await inventoryService.onVehiclesUpdatePromise();
      vehicle = vehicles.find((v: any) => v.id === serviceData.vehicleId) || null;
    } catch {
      /* noop */
    }
  }
  if (vehicle) {
    serviceData.vehicle = vehicle;
    serviceData.vehicleId = vehicle.id;
    serviceData.vehicleIdentifier = buildVehicleIdentifier(vehicle);
    serviceData.customerName = vehicle.ownerName || vehicle.owner || '';
    serviceData.customerPhone = vehicle.ownerPhone || vehicle.phone || null;
  }

  // Asesor (SOBREESCRIBE para asegurar el nombre correcto)
  if (serviceData.serviceAdvisorId) {
    try {
      const users = await adminService.onUsersUpdatePromise();
      const advisor = users.find((u: any) => u.id === serviceData.serviceAdvisorId);
      if (advisor) {
        serviceData.serviceAdvisorName = advisor.name; // Siempre usa el nombre de la DB
        serviceData.serviceAdvisorSignatureDataUrl = advisor.signatureDataUrl || null;
      }
    } catch {
      /* noop */
    }
  }

  // Total
  serviceData.total = pickTotal(serviceData);


  return serviceData;
}

function buildPublicData(svc: any) {
  return {
    // Estado / folio
    folio: svc.folio,
    status: svc.status,
    subStatus: svc.subStatus ?? null,

    // Cliente / asesor
    customerName: svc.customerName || null,
    customerPhone: svc.customerPhone || null,
    serviceAdvisorName: svc.serviceAdvisorName || null,
    serviceAdvisorSignatureDataUrl: svc.serviceAdvisorSignatureDataUrl || null,

    // Vehículo (denormalizado)
    vehicleId: svc.vehicleId || null,
    vehicleIdentifier: svc.vehicleIdentifier || null,
    vehicle: svc.vehicle || null,

    // Fechas
    receptionDateTime: svc.receptionDateTime || null,
    deliveryDateTime: svc.deliveryDateTime || null,
    appointmentDateTime: svc.appointmentDateTime || null,
    appointmentStatus: svc.appointmentStatus || null,

    // Económicos
    serviceItems: Array.isArray(svc.serviceItems) ? svc.serviceItems : [],
    total: toNumber(svc.total),
    payments: Array.isArray(svc.payments) ? svc.payments : [],

    // Otros
    customerComplaints: svc.customerComplaints || null,
    recommendations: svc.recommendations || null,
    workshopInfo: svc.workshopInfo || null,
    customerSignatureReception: svc.customerSignatureReception || null,
    customerSignatureDelivery: svc.customerSignatureDelivery || null,

    // Metadatos públicos
    isPublic: true,
    updatedAt: serverTimestamp(),
    createdAt: svc.createdAt || serverTimestamp(),
  };
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

const onServicesByStatusUpdate = (
  statuses: ServiceRecord['status'][],
  callback: (services: ServiceRecord[]) => void
): (() => void) => {
  if (!db || statuses.length === 0) return () => {};

  if (statuses.length > 10) {
    console.warn("Firestore 'in' query has a limit of 10 items.");
  }

  const qy = query(collection(db, 'serviceRecords'), where('status', 'in', statuses));
  return onSnapshot(qy, (snapshot) => {
    callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceRecord)));
  });
};

const onServicesForVehicleUpdate = (vehicleId: string, callback: (services: ServiceRecord[]) => void): (() => void) => {
  if (!db) return () => {};
  const qy = query(
    collection(db, 'serviceRecords'),
    where('vehicleId', '==', vehicleId),
    orderBy('serviceDate', 'desc')
  );
  return onSnapshot(qy, (snapshot) => {
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
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as any) : null;
};

// ---------------------------------------------------------
// Mutations
// ---------------------------------------------------------
const saveService = async (data: ServiceRecord): Promise<ServiceRecord> => {
  if (!db) throw new Error('Database not initialized.');

  const isNew = !data.id;
  const serviceId = isNew ? doc(collection(db, 'serviceRecords')).id : (data.id as string);

  // Public ID (si no existe, créalo)
  let publicId = data.publicId;
  if (!publicId) {
    publicId = doc(collection(db, 'publicServices')).id.substring(0, 15);
  }

  // Base
  let serviceData: any = {
    ...data,
    id: serviceId,
    publicId,
    updatedAt: serverTimestamp(),
    createdAt: (data as any).createdAt || serverTimestamp(),
    serviceDate: data.serviceDate || new Date(),
  };

  // Denormaliza (vehículo/cliente/asesor/total)
  serviceData = await denormalizeService(serviceData);

  const serviceRef = doc(db, 'serviceRecords', serviceId);
  const publicRef = doc(db, 'publicServices', publicId);

  const batch = writeBatch(db);

  // 1) Upsert del servicio principal
  batch.set(serviceRef, cleanObjectForFirestore(serviceData), { merge: true });

  // 2) Upsert del documento público con payload enriquecido
  const publicData = buildPublicData(serviceData);
  batch.set(publicRef, cleanObjectForFirestore(publicData), { merge: true });

  await batch.commit();

  const saved = await getDoc(serviceRef);
  if (!saved.exists()) throw new Error('Failed to save or retrieve the document.');
  return { ...saved.data(), id: serviceId } as ServiceRecord;
};

const completeService = async (service: ServiceRecord, paymentDetails: any, batch: any): Promise<void> => {
  if (!db) throw new Error('Database not initialized.');
  const serviceRef = doc(db, 'serviceRecords', service.id);

  // Comisiones
  const users: User[] = await adminService.onUsersUpdatePromise();
  const usersMap = new Map(users.map((u) => [u.id, u]));

  let totalTechnicianCommission = 0;
  let serviceAdvisorCommission = 0;

  const serviceItemsWithCommission =
    service.serviceItems?.map((item) => {
      let commissionForItem = 0;
      if (item.technicianId) {
        const technician = usersMap.get(item.technicianId);
        if (technician && typeof technician.commissionRate === 'number' && technician.commissionRate > 0) {
          commissionForItem = (item.sellingPrice || 0) * (technician.commissionRate / 100);
          totalTechnicianCommission += commissionForItem;
        }
      }
      return { ...item, technicianCommission: commissionForItem };
    }) || [];

  const finalTotalFromPayments = (paymentDetails.payments || []).reduce(
    (sum: number, p: any) => sum + (toNumber(p.amount) || 0),
    0
  );

  if (service.serviceAdvisorId) {
    const advisor = usersMap.get(service.serviceAdvisorId);
    if (advisor && typeof advisor.commissionRate === 'number' && advisor.commissionRate > 0) {
      serviceAdvisorCommission = finalTotalFromPayments * (advisor.commissionRate / 100);
    }
  }

  const updatedServiceData: any = {
    ...service,
    total: finalTotalFromPayments,
    serviceItems: serviceItemsWithCommission,
    totalCommission: totalTechnicianCommission,
    serviceAdvisorCommission,
    status: 'Entregado',
    deliveryDateTime: new Date(),
    payments: paymentDetails.payments,
    ...(paymentDetails.nextServiceInfo && { nextServiceInfo: paymentDetails.nextServiceInfo }),
    updatedAt: serverTimestamp(),
  };

  // Denormaliza por si hay que escribir público con datos completos
  const denorm = await denormalizeService(updatedServiceData);

  batch.update(serviceRef, cleanObjectForFirestore(denorm));

  // También actualiza el doc público
  if (denorm.publicId) {
    const publicDocRef = doc(db, 'publicServices', denorm.publicId);
    const publicPatch = buildPublicData(denorm);
    batch.set(publicDocRef, cleanObjectForFirestore(publicPatch), { merge: true });
  }

  // Inventario (insumos consumidos)
  if (service.serviceItems && service.serviceItems.length > 0) {
    const suppliesToSubtract = service.serviceItems
      .flatMap((item) => item.suppliesUsed?.map((supply) => ({ id: supply.supplyId, quantity: supply.quantity })) || [])
      .filter((supply) => supply.id && supply.quantity > 0);

    if (suppliesToSubtract.length > 0) {
      await inventoryService.updateInventoryStock(batch, suppliesToSubtract, 'subtract');
    }
  }
};

const cancelService = async (id: string, reason: string): Promise<void> => {
  if (!db) throw new Error('Database not initialized.');

  const batch = writeBatch(db);
  const serviceRef = doc(db, 'serviceRecords', id);
  const serviceDoc = await getDoc(serviceRef);

  if (serviceDoc.exists()) {
    const service = serviceDoc.data() as ServiceRecord;

    let updatedData: Partial<ServiceRecord> = {};
    if (service.status === 'Agendado') {
      updatedData = {
        status: 'Cotizacion',
        subStatus: null as any,
        appointmentDateTime: null as any,
        cancellationReason: reason,
        updatedAt: serverTimestamp(),
      };
    } else {
      updatedData = {
        status: 'Cancelado',
        cancellationReason: reason,
        updatedAt: serverTimestamp(),
      };

      // Si se manejan insumos en 'items' (compatibilidad con versiones previas)
      const itemsAny: any = (service as any).items;
      if (itemsAny && Array.isArray(itemsAny) && itemsAny.length > 0) {
        await inventoryService.updateInventoryStock(batch, itemsAny, 'add');
      }
    }

    batch.update(serviceRef, updatedData);

    // Doc público
    if (service.publicId) {
      const publicDocRef = doc(db, 'publicServices', service.publicId);
      batch.set(
        publicDocRef,
        cleanObjectForFirestore({
          status: updatedData.status,
          subStatus: (updatedData as any).subStatus ?? null,
          appointmentDateTime: (updatedData as any).appointmentDateTime ?? service.appointmentDateTime ?? null,
          updatedAt: serverTimestamp(),
        }),
        { merge: true }
      );
    }

    await batch.commit();
  }
};

const deleteService = async (id: string): Promise<void> => {
  if (!db) throw new Error('Database not initialized.');

  const serviceRef = doc(db, 'serviceRecords', id);
  const serviceDoc = await getDoc(serviceRef);

  if (serviceDoc.exists()) {
    const service = serviceDoc.data() as ServiceRecord;
    const batch = writeBatch(db);

    // Eliminar principal
    batch.delete(serviceRef);

    // Eliminar público
    if (service.publicId) {
      const publicDocRef = doc(db, 'publicServices', service.publicId);
      batch.delete(publicDocRef);
    }

    await batch.commit();
  }
};

const updateService = async (id: string, data: Partial<ServiceRecord>): Promise<void> => {
  if (!db) throw new Error('Database not initialized.');
  const serviceRef = doc(db, 'serviceRecords', id);
  const snap = await getDoc(serviceRef);
  if (!snap.exists()) throw new Error('Service not found.');
  const current = snap.data() as ServiceRecord;

  // Merge base
  let merged: any = {
    ...current,
    ...data,
    updatedAt: serverTimestamp(),
  };

  // Denormaliza previo a guardar
  merged = await denormalizeService(merged);

  const batch = writeBatch(db);
  batch.set(serviceRef, cleanObjectForFirestore(merged), { merge: true });

  if (merged.publicId) {
    const publicRef = doc(db, 'publicServices', merged.publicId);
    const publicData = buildPublicData(merged);
    batch.set(publicRef, cleanObjectForFirestore(publicData), { merge: true });
  }

  await batch.commit();
};

// ---------------------------------------------------------
// Export
// ---------------------------------------------------------
export const serviceService = {
  onServicesUpdate,
  onServicesByStatusUpdate,
  onServicesForVehicleUpdate,
  onServicesUpdatePromise,
  getDocById,
  saveService,
  completeService,
  cancelService,
  deleteService,
  updateService,
};
