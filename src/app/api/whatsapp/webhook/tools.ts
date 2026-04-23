/**
 * SofIA — Tools v3
 * Ranoro — Taller Mecánico Automotriz
 *
 * Tools: get_vehicle_status, get_vehicle_history, get_service_prices,
 *        check_workshop_availability, create_appointment, get_upcoming_appointments,
 *        cancel_appointment, escalate_to_human, search_customer_by_name,
 *        link_customer_phone.
 *
 * Pricing: Dynamic lookup from pricingGroups + oilsCatalog + partTypesCatalog.
 */

import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

// ── Types ──────────────────────────────────────────────────────────

export interface PhoneCustomerResult {
  id: string;
  name: string;
  phone?: string;
  vehicles?: { make: string; model: string; year: number; licensePlate?: string }[];
}

// ── Helper: status label ───────────────────────────────────────────

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: '⏳ En espera de revisión',
    in_progress: '🔧 En proceso de reparación',
    ready: '✅ Listo para entrega',
    delivered: '📦 Entregado',
    cancelled: '❌ Cancelado',
  };
  return map[s] || s;
}

// ── Tool: get_vehicle_status ───────────────────────────────────────

export async function getVehicleStatus(phone: string): Promise<any> {
  try {
    const clean = phone.replace(/\D/g, '');
    const variants = [clean, `52${clean}`, `521${clean}`].filter(v => v.length >= 7);

    for (const v of variants) {
      const snap = await getAdminDb().collection('serviceRecords')
        .where('ownerPhone', '==', v)
        .where('status', 'in', ['pending', 'in_progress', 'ready'])
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get();

      if (!snap.empty) {
        const services = snap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            vehicle: d.vehicleInfo || `${d.make || ''} ${d.model || ''} ${d.year || ''}`.trim() || d.licensePlate || 'Vehículo',
            status: statusLabel(d.status),
            statusRaw: d.status,
            serviceType: d.serviceTypeLabel || d.serviceType || 'Servicio general',
            total: d.totalAmount || d.total || 0,
            notes: d.mechanicNotes || d.notes || '',
          };
        });
        return { found: true, services };
      }
    }
    return { found: false, message: 'No encontré ningún servicio activo con este número de teléfono. ¿Lo registraste con otro número o a nombre de otra persona?' };
  } catch (e: any) {
    console.error('[SofIA] getVehicleStatus error:', e);
    return { error: 'Error al consultar el estatus del vehículo.' };
  }
}

// ── Tool: get_vehicle_history ──────────────────────────────────────

export async function getVehicleHistory(phone: string, limit = 5): Promise<any> {
  try {
    const clean = phone.replace(/\D/g, '');
    const variants = [clean, `52${clean}`, `521${clean}`].filter(v => v.length >= 7);

    for (const v of variants) {
      const snap = await getAdminDb().collection('serviceRecords')
        .where('ownerPhone', '==', v)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      if (!snap.empty) {
        const history = snap.docs.map(doc => {
          const d = doc.data();
          const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt || 0);
          return {
            id: doc.id,
            vehicle: d.vehicleInfo || `${d.make || ''} ${d.model || ''}`.trim() || 'Vehículo',
            serviceType: d.serviceTypeLabel || d.serviceType || 'Servicio',
            status: statusLabel(d.status),
            total: d.totalAmount || d.total || 0,
            date: date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
          };
        });
        return { found: true, total: history.length, history };
      }
    }
    return { found: false, message: 'No encontré historial de servicios con este número.' };
  } catch (e: any) {
    console.error('[SofIA] getVehicleHistory error:', e);
    return { error: 'Error al consultar el historial de servicios.' };
  }
}

// ── Tool: get_service_prices ───────────────────────────────────────
// Looks up pricingGroups for a vehicle match, then calculates the
// real price: labor + specific parts (with optional upgrades like platinum plugs).

export async function getServicePrices(args: {
  make: string;
  model: string;
  year: number | string;
  serviceType?: string;
  partUpgrades?: string; // e.g. "bujias de platino"
}): Promise<any> {
  try {
    const make = args.make.trim().toLowerCase();
    const model = args.model.trim().toLowerCase();
    const year = typeof args.year === 'string' ? parseInt(args.year) : args.year;

    // 1. Find matching pricingGroup
    const groupsSnap = await getAdminDb().collection('pricingGroups').get();
    let matchedGroup: any = null;

    for (const doc of groupsSnap.docs) {
      const g = doc.data();
      const vehicles: any[] = g.vehicles || [];
      const match = vehicles.some(v => {
        const makeFit = !v.make || v.make.toLowerCase().includes(make) || make.includes(v.make.toLowerCase());
        const modelFit = !v.model || v.model.toLowerCase().includes(model) || model.includes(v.model.toLowerCase());
        const yearFit = !v.yearFrom || (!v.yearTo
          ? v.yearFrom <= year
          : v.yearFrom <= year && year <= v.yearTo);
        return makeFit && modelFit && yearFit;
      });
      if (match) { matchedGroup = { id: doc.id, ...g }; break; }
    }

    if (!matchedGroup) {
      return {
        found: false,
        message: `No tenemos un catálogo de precios específico para ${args.make} ${args.model} ${args.year}. Para una cotización exacta, puedes traer el vehículo a diagnóstico o llamarnos directamente.`,
      };
    }

    const services: any[] = matchedGroup.services || [];
    const parts: any[] = matchedGroup.parts || [];
    const oilLiters: number = matchedGroup.oilCapacityLiters || 4;

    // Filter by serviceType if specified
    const requestedType = (args.serviceType || '').toLowerCase();
    const filteredServices = requestedType
      ? services.filter(s => s.name?.toLowerCase().includes(requestedType) || s.type?.toLowerCase().includes(requestedType))
      : services;

    // 2. Get oil prices for context
    let oilInfo = '';
    try {
      const oilSnap = await getAdminDb().doc('oilsCatalog/main').get();
      if (oilSnap.exists) {
        const oils: any[] = oilSnap.data()?.oils || [];
        const cheapestOil = oils.sort((a, b) => (a.pricePerLiter || 0) - (b.pricePerLiter || 0))[0];
        if (cheapestOil) {
          const oilTotal = (cheapestOil.pricePerLiter || 0) * oilLiters;
          oilInfo = `Aceite incluido (${oilLiters}L ${cheapestOil.name || 'convencional'}): $${oilTotal.toFixed(0)} MXN`;
        }
      }
    } catch { /* non-critical */ }

    // 3. Check for part upgrades (e.g., platinum plugs)
    let upgradeInfo = '';
    if (args.partUpgrades) {
      const upgradeQ = args.partUpgrades.toLowerCase();
      try {
        const partTypesSnap = await getAdminDb().collection('partTypesCatalog').get();
        for (const doc of partTypesSnap.docs) {
          const pt = doc.data();
          if (pt.name?.toLowerCase().includes(upgradeQ) || upgradeQ.includes(pt.name?.toLowerCase())) {
            const brands: any[] = pt.brands || [];
            const premiumBrand = brands.find(b => b.type === 'premium' || b.name?.toLowerCase().includes('platin') || b.name?.toLowerCase().includes('iridium'));
            if (premiumBrand) {
              upgradeInfo = `Upgrade ${pt.name} ${premiumBrand.name}: +$${premiumBrand.price || 0} MXN extra`;
            }
            break;
          }
        }
      } catch { /* non-critical */ }
    }

    // 4. Build result
    const result: any = {
      found: true,
      vehicle: `${args.make} ${args.model} ${args.year}`,
      group: matchedGroup.name || 'Grupo genérico',
      services: filteredServices.length > 0
        ? filteredServices.map(s => ({ name: s.name, laborCost: s.laborCost || 0, total: s.total || s.laborCost || 0, includes: s.includes || '' }))
        : services.slice(0, 5).map(s => ({ name: s.name, laborCost: s.laborCost || 0, total: s.total || s.laborCost || 0 })),
    };
    if (oilInfo) result.oilNote = oilInfo;
    if (upgradeInfo) result.upgradeNote = upgradeInfo;

    return result;
  } catch (e: any) {
    console.error('[SofIA] getServicePrices error:', e);
    return { error: 'Error al consultar los precios. Por favor intenta de nuevo.' };
  }
}

// ── Tool: check_workshop_availability ─────────────────────────────

export async function checkWorkshopAvailability(date: string, serviceType?: string): Promise<any> {
  try {
    const slots = ['08:30', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
    const snap = await getAdminDb().collection('workshopAppointments')
      .where('date', '==', date)
      .where('status', '!=', 'cancelled')
      .get();

    const takenSlots = snap.docs.map(d => d.data().timeSlot).filter(Boolean);
    const available = slots.filter(s => !takenSlots.includes(s));

    if (available.length === 0) {
      return { available: false, message: `No hay horarios disponibles el ${date}. ¿Quieres revisar otra fecha?` };
    }

    return {
      available: true,
      date,
      slots: available.slice(0, 6),
      message: `Tenemos ${available.length} horarios disponibles el ${date}.`,
    };
  } catch (e: any) {
    console.error('[SofIA] checkWorkshopAvailability error:', e);
    return { error: 'Error al consultar disponibilidad.' };
  }
}

// ── Tool: create_appointment ───────────────────────────────────────

export async function createWorkshopAppointment(args: {
  clientName: string;
  clientPhone: string;
  vehicleInfo: string;
  serviceType: string;
  date: string;
  timeSlot: string;
  notes?: string;
}): Promise<any> {
  try {
    if (!args.clientName || !args.date || !args.timeSlot || !args.vehicleInfo) {
      return { success: false, message: 'Faltan datos para agendar. Necesito: nombre, vehículo, fecha y horario.' };
    }

    const docRef = await getAdminDb().collection('workshopAppointments').add({
      clientName: args.clientName.trim(),
      clientPhone: args.clientPhone.replace(/\D/g, ''),
      vehicleInfo: args.vehicleInfo.trim(),
      serviceType: args.serviceType.trim(),
      date: args.date,
      timeSlot: args.timeSlot,
      status: 'scheduled',
      notes: args.notes || '',
      source: 'whatsapp-bot',
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`[SofIA] create_appointment: ${args.clientName} → ${docRef.id}`);
    return {
      success: true,
      appointmentId: docRef.id,
      message: `Cita agendada para ${args.clientName} el ${args.date} a las ${args.timeSlot} 🔧 Vehículo: ${args.vehicleInfo}. Te esperamos en Ranoro.`,
    };
  } catch (e: any) {
    console.error('[SofIA] createWorkshopAppointment error:', e);
    return { success: false, message: 'Error al registrar la cita. Por favor intenta de nuevo.' };
  }
}

// ── Tool: get_upcoming_appointments ───────────────────────────────

export async function getUpcomingAppointments(phone: string): Promise<any> {
  try {
    const clean = phone.replace(/\D/g, '');
    const today = new Date().toISOString().split('T')[0];
    const snap = await getAdminDb().collection('workshopAppointments')
      .where('clientPhone', '==', clean)
      .where('status', 'in', ['scheduled', 'confirmed'])
      .orderBy('date', 'asc')
      .limit(5)
      .get();

    if (snap.empty) return { found: false, message: 'No tienes citas programadas próximamente.' };

    const appointments = snap.docs.map(doc => {
      const d = doc.data();
      return { id: doc.id, date: d.date, time: d.timeSlot, vehicle: d.vehicleInfo, service: d.serviceType, status: d.status };
    });
    return { found: true, appointments };
  } catch (e: any) {
    return { error: 'Error al consultar tus citas.' };
  }
}

// ── Tool: cancel_appointment ───────────────────────────────────────

export async function cancelAppointment(appointmentId: string): Promise<any> {
  try {
    await getAdminDb().collection('workshopAppointments').doc(appointmentId).update({ status: 'cancelled', cancelledAt: FieldValue.serverTimestamp() });
    return { success: true, message: 'Cita cancelada exitosamente.' };
  } catch (e: any) {
    return { success: false, message: 'Error al cancelar la cita.' };
  }
}

// ── Tool: escalate_to_human ────────────────────────────────────────

export async function escalateToHuman(phone: string, reason: string): Promise<any> {
  try {
    await getAdminDb().collection('whatsapp-conversations').doc(phone).set({
      humanTakeover: true,
      humanTakeoverAt: FieldValue.serverTimestamp(),
      needsAttention: true,
      escalationReason: reason,
    }, { merge: true });
    return { message: 'Transferida al equipo de Ranoro. En breve te contactará alguien del taller.' };
  } catch (e: any) {
    return { message: 'Escalación activada con error parcial.' };
  }
}

// ── Customer cache ─────────────────────────────────────────────────

interface CachedCustomer { id: string; name: string; phone?: string; nameNorm: string; }
let customersCache: CachedCustomer[] = [];
let lastCacheTime = 0;

const norm = (s: string) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '';

export function invalidateCache() { lastCacheTime = 0; }

async function ensureCacheLoaded() {
  if (customersCache.length > 0 && Date.now() - lastCacheTime < 6 * 60 * 60 * 1000) return;
  try {
    const snap = await getAdminDb().collection('users').limit(2000).get();
    customersCache = snap.docs.map(doc => {
      const d = doc.data();
      const name = `${d.firstName || ''} ${d.lastName || d.paternalLastName || ''}`.trim() || d.name || 'Cliente';
      return { id: doc.id, name, phone: d.phone || d.whatsapp || '', nameNorm: norm(name) };
    });
    lastCacheTime = Date.now();
  } catch (e: any) { console.error('[SofIA Cache] Error:', e.message); }
}

export async function findCustomersByPhone(phone: string): Promise<PhoneCustomerResult[]> {
  try {
    const clean = phone.replace(/\D/g, '');
    const snap = await getAdminDb().collection('users').where('phone', 'in', [clean, `52${clean}`]).limit(3).get();
    if (!snap.empty) return snap.docs.map(doc => { const d = doc.data(); return { id: doc.id, name: `${d.firstName || ''} ${d.lastName || ''}`.trim() || d.name || 'Cliente', phone: d.phone }; });
    return [];
  } catch { return []; }
}

export async function searchCustomerByName(nameQuery: string): Promise<any[]> {
  try {
    await ensureCacheLoaded();
    const q = norm(nameQuery);
    if (q.length < 2) return [];
    const tokens = q.split(' ').filter(t => t.length > 1);
    return customersCache.filter(c => tokens.every(t => c.nameNorm.includes(t))).slice(0, 5)
      .map(c => ({ id: c.id, name: c.name, phone: c.phone }));
  } catch { return []; }
}

// ── Staff tools ────────────────────────────────────────────────────

export async function getTodayAppointments(): Promise<any> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const snap = await getAdminDb().collection('workshopAppointments').where('date', '==', today).orderBy('timeSlot', 'asc').get();
    if (snap.empty) return { total: 0, message: `No hay citas para hoy (${today}).` };
    const appointments = snap.docs.map(doc => {
      const d = doc.data();
      return { time: d.timeSlot, client: d.clientName, vehicle: d.vehicleInfo, service: d.serviceType, status: d.status };
    });
    return { total: appointments.length, date: today, appointments };
  } catch (e: any) { return { error: 'Error al consultar citas del día.' }; }
}

export async function getWorkshopStats(): Promise<any> {
  try {
    const [usersSnap, servicesSnap, apptSnap] = await Promise.all([
      getAdminDb().collection('users').count().get(),
      getAdminDb().collection('serviceRecords').count().get(),
      getAdminDb().collection('workshopAppointments').count().get(),
    ]);
    return {
      totalClients: usersSnap.data().count,
      totalServices: servicesSnap.data().count,
      totalAppointments: apptSnap.data().count,
      message: `Ranoro: ${usersSnap.data().count} clientes, ${servicesSnap.data().count} servicios, ${apptSnap.data().count} citas totales.`,
    };
  } catch { return { message: 'Error al obtener estadísticas.' }; }
}

// ── Tool Declarations ──────────────────────────────────────────────

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'get_vehicle_status',
    description: 'Consulta el estatus actual del vehículo del cliente en el taller (en espera, en reparación, listo para entrega). Ejecutar OBLIGATORIAMENTE cuando el cliente pregunte por su carro.',
    parameters: { type: SchemaType.OBJECT, properties: { phone: { type: SchemaType.STRING, description: 'Teléfono del cliente (se usa el de la conversación si no se especifica)' } } },
  },
  {
    name: 'get_vehicle_history',
    description: 'Consulta el historial de servicios previos del cliente.',
    parameters: { type: SchemaType.OBJECT, properties: { phone: { type: SchemaType.STRING, description: 'Teléfono del cliente' }, limit: { type: SchemaType.NUMBER, description: 'Número de servicios a mostrar (default 5)' } } },
  },
  {
    name: 'get_service_prices',
    description: 'Consulta los precios REALES de servicio para un vehículo específico desde la base de datos de precios del taller. Siempre usar esta herramienta en lugar de inventar precios.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        make: { type: SchemaType.STRING, description: 'Marca del vehículo (ej: Nissan, Toyota, Chevrolet)' },
        model: { type: SchemaType.STRING, description: 'Modelo del vehículo (ej: Versa, Corolla, Aveo)' },
        year: { type: SchemaType.NUMBER, description: 'Año del vehículo (ej: 2019)' },
        serviceType: { type: SchemaType.STRING, description: 'Tipo de servicio solicitado (ej: afinación, cambio de aceite, frenos)' },
        partUpgrades: { type: SchemaType.STRING, description: 'Mejoras de refacciones solicitadas (ej: bujías de platino, filtro premium)' },
      },
      required: ['make', 'model', 'year'],
    },
  },
  {
    name: 'check_workshop_availability',
    description: 'Consulta los horarios disponibles en el taller para una fecha específica.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: { type: SchemaType.STRING, description: 'Fecha en formato YYYY-MM-DD' },
        serviceType: { type: SchemaType.STRING, description: 'Tipo de servicio (opcional)' },
      },
      required: ['date'],
    },
  },
  {
    name: 'create_appointment',
    description: 'Agenda una cita en el taller mecánico Ranoro.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        clientName: { type: SchemaType.STRING, description: 'Nombre del cliente' },
        clientPhone: { type: SchemaType.STRING, description: 'Teléfono del cliente' },
        vehicleInfo: { type: SchemaType.STRING, description: 'Información del vehículo (marca, modelo, año, placas)' },
        serviceType: { type: SchemaType.STRING, description: 'Tipo de servicio a realizar' },
        date: { type: SchemaType.STRING, description: 'Fecha de la cita (YYYY-MM-DD)' },
        timeSlot: { type: SchemaType.STRING, description: 'Horario de la cita (ej: 08:30, 13:00)' },
        notes: { type: SchemaType.STRING, description: 'Notas adicionales' },
      },
      required: ['clientName', 'vehicleInfo', 'serviceType', 'date', 'timeSlot'],
    },
  },
  {
    name: 'get_upcoming_appointments',
    description: 'Consulta las citas próximas del cliente.',
    parameters: { type: SchemaType.OBJECT, properties: { phone: { type: SchemaType.STRING, description: 'Teléfono del cliente' } } },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancela una cita del cliente.',
    parameters: { type: SchemaType.OBJECT, properties: { appointmentId: { type: SchemaType.STRING, description: 'ID de la cita a cancelar' } }, required: ['appointmentId'] },
  },
  {
    name: 'escalate_to_human',
    description: 'Transfiere la conversación al equipo humano de Ranoro. Usar cuando el cliente está molesto, tiene un problema complejo o solicita hablar con alguien.',
    parameters: { type: SchemaType.OBJECT, properties: { reason: { type: SchemaType.STRING, description: 'Razón del escalamiento' } }, required: ['reason'] },
  },
  {
    name: 'search_customer_by_name',
    description: 'Busca clientes por nombre en la base de datos.',
    parameters: { type: SchemaType.OBJECT, properties: { nameQuery: { type: SchemaType.STRING, description: 'Nombre a buscar' } }, required: ['nameQuery'] },
  },
  {
    name: 'link_customer_phone',
    description: 'Vincula el teléfono del cliente a la conversación para identificarle en futuras interacciones.',
    parameters: { type: SchemaType.OBJECT, properties: { phoneNumber: { type: SchemaType.STRING, description: 'Número de teléfono a 10 dígitos' } }, required: ['phoneNumber'] },
  },
];

export const staffToolDeclarations: FunctionDeclaration[] = [
  { name: 'get_vehicle_status', description: 'Estatus del vehículo de un cliente.', parameters: { type: SchemaType.OBJECT, properties: { phone: { type: SchemaType.STRING, description: 'Teléfono del cliente' } } } },
  { name: 'get_vehicle_history', description: 'Historial de servicios del cliente.', parameters: { type: SchemaType.OBJECT, properties: { phone: { type: SchemaType.STRING, description: 'Teléfono del cliente' } } } },
  { name: 'search_customer_by_name', description: 'Busca clientes por nombre.', parameters: { type: SchemaType.OBJECT, properties: { nameQuery: { type: SchemaType.STRING, description: 'Nombre del cliente' } }, required: ['nameQuery'] } },
  { name: 'get_today_appointments', description: 'Citas del taller para hoy.', parameters: { type: SchemaType.OBJECT, properties: {} } },
  { name: 'get_workshop_stats', description: 'Estadísticas generales del taller.', parameters: { type: SchemaType.OBJECT, properties: {} } },
];
