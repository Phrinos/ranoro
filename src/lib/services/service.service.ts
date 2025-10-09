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
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord, User } from '@/types';
import { cleanObjectForFirestore } from '../forms';
import { inventoryService } from './inventory.service';
import { adminService } from './admin.service';

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------
const toNumber = (v: any): number =>
  typeof v === 'number'
    ? (Number.isFinite(v) ? v : 0)
    : typeof v === 'string'
      ? (Number(v.replace(/[^\d.-]/g, '')) || 0)
      : 0;

const pickTotal = (o: any): number => {
  if (!o) return 0;
  const candidates = [o.total, o.Total, o.totalCost, o.subtotal, o.grandTotal];
  for (const c of candidates) {
    const n = toNumber(c);
    if (n > 0) return n;
  }
  return 0;
};

const normalizePayments = (arr: any[] = []) =>
  arr
    .filter((p) => p && p.amount !== undefined)
    .map((p) => ({
      ...p,
      amount: toNumber(p.amount),
      date: p.date ? new Date(p.date) : new Date(),
    }));

const buildVehicleIdentifier = (v: any | null | undefined) => {
  if (!v) return undefined;
  const parts = [v.make, v.model].filter(Boolean).join(' ');
  const year = v.year ? ` (${v.year})` : '';
  const plate = v.licensePlate ? ` ${v.licensePlate}` : '';
  const out = `${parts}${year}${plate}`.trim();
  return out || undefined;
};

/**
 * Mezcla datos de vehículo/cliente/asesor/total dentro del objeto de servicio.
 * - Si trae vehicle completo lo usa; si no, intenta resolver por vehicleId.
 * - Sobrescribe nombre de asesor desde adminService.
 */
async function denormalizeService(base: any): Promise<any> {
  const serviceData = { ...base };

  // Vehículo
  let vehicle = serviceData.vehicle || null;
  if (!vehicle && serviceData.vehicleId) {
    try {
      if ((inventoryService as any).getVehicleById) {
        vehicle = await (inventoryService as any).getVehicleById(serviceData.vehicleId);
      } else {
        const vehicles = await inventoryService.onVehiclesUpdatePromise();
        vehicle = vehicles.find((v: any) => v.id === serviceData.vehicleId) || null;
      }
    } catch {
      /* noop */
    }
  }
  if (vehicle) {
    serviceData.vehicle = vehicle;
    serviceData.vehicleId = vehicle.id;
    serviceData.vehicleIdentifier = buildVehicleIdentifier(vehicle);
    serviceData.customerName = vehicle.ownerName || vehicle.owner || serviceData.customerName || '';
    serviceData.customerPhone = vehicle.ownerPhone || vehicle.phone || serviceData.customerPhone || null;
  }

  // Asesor
  if (serviceData.serviceAdvisorId) {
    try {
      const users = await adminService.onUsersUpdatePromise();
      const advisor = users.find((u: any) => u.id === serviceData.serviceAdvisorId);
      if (advisor) {
        serviceData.serviceAdvisorName = advisor.name || serviceData.serviceAdvisorName || null;
        serviceData.serviceAdvisorSignatureDataUrl = advisor.signatureDataUrl || serviceData.serviceAdvisorSignatureDataUrl || null;
      }
    } catch {
      /* noop */
    }
  }

  // Económicos
  serviceData.total = pickTotal(serviceData);
  serviceData.totalCost = pickTotal(serviceData);
  if (Array.isArray(serviceData.payments)) {
    serviceData.payments = normalizePayments(serviceData.payments);
  }

  // Items siempre array
  if (!Array.isArray(serviceData.serviceItems)) serviceData.serviceItems = [];

  return serviceData;
}

function buildPublicData(svc: any) {
  return {
    // Estado / folio
    folio: svc.folio || null,
    status: svc.status || null,
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
    payments: Array.isArray(svc.payments) ? normalizePayments(svc.payments) : [],

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

  // Public ID (si no existe, créalo; conserva el esquema previo)
  let publicId = (data as any).publicId;
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
    serviceDate: (data as any).serviceDate || new Date(),
  };
  
  // Si es un nuevo servicio, inicializa los campos del técnico como null
  if (isNew) {
    serviceData = {
      ...serviceData,
      technicianId: null,
      technicianName: null,
    };
  }

  // Denormaliza (vehículo/cliente/asesor/total/pagos)
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

/**
 * Completa un servicio: calcula comisiones (con quantity), marca Entregado, guarda pagos,
 * sincroniza documento público y descuenta insumos usados.
 * Debe ejecutarse dentro de un batch proporcionado por el caller.
 */
const completeService = async (service: ServiceRecord, paymentDetails: any, batch: any): Promise<void> => {
  if (!db) throw new Error('Database not initialized.');
  if (!service?.id) throw new Error('Invalid service.');

  // Evita doble completado
  if ((service as any).status === 'Entregado') return;

  const serviceRef = doc(db, 'serviceRecords', service.id);

  // Comisiones
  const users: User[] = await adminService.onUsersUpdatePromise();
  const usersMap = new Map(users.map((u) => [u.id, u]));

  let totalTechnicianCommission = 0;
  let serviceAdvisorCommission = 0;

  const serviceItemsWithCommission =
    (service.serviceItems || []).map((item: any) => {
      let commissionForItem = 0;
      const qty = toNumber(item?.quantity ?? 1);
      const lineTotal = toNumber(item?.sellingPrice) * (qty || 1);

      if (item.technicianId) {
        const technician = usersMap.get(item.technicianId);
        if (technician && typeof (technician as any).commissionRate === 'number' && (technician as any).commissionRate > 0) {
          commissionForItem = lineTotal * ((technician as any).commissionRate / 100);
          totalTechnicianCommission += commissionForItem;
        }
      }
      return { ...item, technicianCommission: commissionForItem };
    });

  const normalizedPayments = normalizePayments(paymentDetails?.payments || []);
  const finalTotalFromPayments = normalizedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  if (service.serviceAdvisorId) {
    const advisor = usersMap.get(service.serviceAdvisorId);
    if (advisor && typeof (advisor as any).commissionRate === 'number' && (advisor as any).commissionRate > 0) {
      serviceAdvisorCommission = finalTotalFromPayments * ((advisor as any).commissionRate / 100);
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
    payments: normalizedPayments,
    ...(paymentDetails?.nextServiceInfo && { nextServiceInfo: paymentDetails.nextServiceInfo }),
    updatedAt: serverTimestamp(),
  };

  // Denormaliza para escribir público con datos completos
  const denorm = await denormalizeService(updatedServiceData);

  batch.update(serviceRef, cleanObjectForFirestore(denorm));

  // También actualiza el doc público
  if (denorm.publicId) {
    const publicDocRef = doc(db, 'publicServices', denorm.publicId);
    const publicPatch = buildPublicData(denorm);
    batch.set(publicDocRef, cleanObjectForFirestore(publicPatch), { merge: true });
  }

  // Inventario (insumos consumidos por suppliesUsed)
  if (service.serviceItems && service.serviceItems.length > 0) {
    const suppliesToSubtract = service.serviceItems
      .flatMap((item: any) => item?.suppliesUsed?.map((supply: any) => ({ id: supply?.supplyId, quantity: toNumber(supply?.quantity) })) || [])
      .filter((s: any) => s.id && s.quantity > 0);

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
        // @ts-expect-error: explicit nulls for Firestore
        subStatus: null,
        // @ts-expect-error
        appointmentDateTime: null,
        cancellationReason: reason as any,
        updatedAt: serverTimestamp(),
      };
    } else {
      updatedData = {
        status: 'Cancelado',
        cancellationReason: reason as any,
        updatedAt: serverTimestamp(),
      };

      // Compatibilidad con versiones previas (devolver items al inventario si existían en "items")
      const itemsAny: any = (service as any).items;
      if (itemsAny && Array.isArray(itemsAny) && itemsAny.length > 0) {
        await inventoryService.updateInventoryStock(batch, itemsAny, 'add');
      }
    }

    batch.update(serviceRef, cleanObjectForFirestore(updatedData));

    // Doc público
    if ((service as any).publicId) {
      const publicDocRef = doc(db, 'publicServices', (service as any).publicId);
      batch.set(
        publicDocRef,
        cleanObjectForFirestore({
          status: (updatedData as any).status,
          subStatus: (updatedData as any).subStatus ?? null,
          appointmentDateTime: (updatedData as any).appointmentDateTime ?? (service as any).appointmentDateTime ?? null,
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
    if ((service as any).publicId) {
      const publicDocRef = doc(db, 'publicServices', (service as any).publicId);
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

  if ((merged as any).publicId) {
    const publicRef = doc(db, 'publicServices', (merged as any).publicId);
    const publicData = buildPublicData(merged);
    batch.set(publicRef, cleanObjectForFirestore(publicData), { merge: true });
  }

  await batch.commit();
};

/**
 * Wrapper atómico para el flujo de “Entregar y Cobrar”.
 * Crea el batch, llama completeService y devuelve el documento actualizado.
 */
const chargeAndDeliverService = async (serviceId: string, paymentDetails: any): Promise<ServiceRecord> => {
  if (!db) throw new Error('Database not initialized.');
  const serviceRef = doc(db, 'serviceRecords', serviceId);
  const snap = await getDoc(serviceRef);
  if (!snap.exists()) throw new Error('Service not found.');

  const service = { id: serviceId, ...snap.data() } as ServiceRecord;
  const batch = writeBatch(db);
  await completeService(service, paymentDetails, batch);
  await batch.commit();

  const updated = await getDoc(serviceRef);
  return { id: serviceId, ...(updated.data() as any) } as ServiceRecord;
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
  chargeAndDeliverService,
};
