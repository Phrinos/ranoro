// src/lib/services/agenda.service.ts
// Fuente de la verdad para citas (colección "appointments")
// También provee una vista de ServiceRecords con status="Agendado" por compatibilidad histórica.

import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { Appointment, AppointmentStatus, ServiceRecord } from '@/types';

const COLLECTION = 'appointments';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fromDoc = (d: any): Appointment => ({ id: d.id, ...d.data() } as Appointment);

// ── Listeners ────────────────────────────────────────────────────────────────

/**
 * Realtime listener sobre TODOS los appointments (para el dashboard de agenda).
 * Ordena por appointmentDateTime ascendente.
 */
const onAppointmentsUpdate = (
  callback: (appointments: Appointment[]) => void
): (() => void) => {
  if (!db) return () => {};

  const q = query(
    collection(db, COLLECTION),
    orderBy('appointmentDateTime', 'asc')
  );

  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(fromDoc)),
    (err) => {
      console.error('Error listening to appointments:', err.message);
      callback([]);
    }
  );
};

/**
 * Listener filtrado por rango de fechas (ISO strings).
 */
const onAppointmentsInRange = (
  startISO: string,
  endISO: string,
  callback: (appointments: Appointment[]) => void
): (() => void) => {
  if (!db) return () => {};

  const q = query(
    collection(db, COLLECTION),
    where('appointmentDateTime', '>=', startISO),
    where('appointmentDateTime', '<=', endISO),
    orderBy('appointmentDateTime', 'asc')
  );

  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(fromDoc)),
    (err) => {
      console.error('Error in range listener:', err.message);
      callback([]);
    }
  );
};

/**
 * LEGACY: listener de ServiceRecords con status="Agendado"
 * Mantiene compatibilidad con el tab-agenda viejo mientras se migra.
 */
const onLegacyAgendaUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
  if (!db) return () => {};

  const q = query(
    collection(db, 'serviceRecords'),
    where('status', '==', 'Agendado'),
    orderBy('appointmentDateTime', 'asc')
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceRecord)));
  }, (err) => {
    console.error('Error in legacy agenda listener:', err.message);
    callback([]);
  });
};

// ── CRUD ─────────────────────────────────────────────────────────────────────

const createAppointment = async (data: Omit<Appointment, 'id'>): Promise<Appointment> => {
  if (!db) throw new Error('DB not initialized');

  const payload = {
    ...data,
    status: data.status || 'Pendiente',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const ref = await addDoc(collection(db, COLLECTION), payload);
  return { ...payload, id: ref.id } as Appointment;
};

const updateAppointment = async (
  id: string,
  data: Partial<Omit<Appointment, 'id'>>
): Promise<void> => {
  if (!db) throw new Error('DB not initialized');
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
};

const deleteAppointment = async (id: string): Promise<void> => {
  if (!db) throw new Error('DB not initialized');
  await deleteDoc(doc(db, COLLECTION, id));
};

const getAppointmentById = async (id: string): Promise<Appointment | null> => {
  if (!db) return null;
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Appointment) : null;
};

/**
 * Busca si un vehículo tiene cotizaciones previas (ServiceRecord con status='Cotizacion').
 */
const getQuotesForVehicle = async (vehicleId: string): Promise<ServiceRecord[]> => {
  if (!db || !vehicleId) return [];
  const q = query(
    collection(db, 'serviceRecords'),
    where('vehicleId', '==', vehicleId),
    where('status', '==', 'Cotizacion'),
    orderBy('serviceDate', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceRecord));
};

// ── Exports ───────────────────────────────────────────────────────────────────

export const agendaService = {
  onAppointmentsUpdate,
  onAppointmentsInRange,
  onLegacyAgendaUpdate,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAppointmentById,
  getQuotesForVehicle,
};
