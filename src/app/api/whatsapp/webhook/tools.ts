/**
 * SinergIA WhatsApp Agent — Firestore Tools v2
 * Functions that Gemini can call to interact with the clinic's data.
 *
 * Cambios v2:
 *  - Corte mañana/tarde alineado con prompt (< 12, no < 13)
 *  - checkAvailability devuelve datos estructurados sin instrucciones al modelo
 *  - escalateToHuman devuelve confirmación interna, no frases para el paciente
 */
import { getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { SchemaType, type FunctionDeclaration } from '@google/generative-ai';

function getPatientFullName(patient: any): string {
  const first = (patient.firstName ?? '').trim();
  // Prefer new separate fields; fall back to legacy `lastName` only if both are empty
  const paternal = (patient.paternalLastName ?? '').trim();
  const maternal = (patient.maternalLastName ?? '').trim();
  const legacyLast = (patient.lastName ?? '').trim();
  const last = (paternal || maternal) ? `${paternal} ${maternal}`.trim() : legacyLast;
  const full = `${first} ${last}`.replace(/\s+/g, ' ').trim();
  return full || patient.name || 'Paciente';
}

// ── Types ──────────────────────────────────────────────────────────

interface AvailabilityResult {
  available: boolean;
  slots: string[];
  dateFormatted: string;
  message: string;
  suggested?: { time: string; formatted: string; period: string }[];
}

interface AppointmentResult {
  success: boolean;
  appointmentId?: string;
  message: string;
}

interface UpcomingAppointment {
  id: string;
  patientName: string;
  date: string;
  dateFormatted: string;
  timeFormatted: string;
  duration: number;
  status: string;
  office: string;
}

// ── Schedule helpers ───────────────────────────────────────────────

const dayNameMapping: Record<string, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sábado',
};

const dayNameMappingReverse: Record<string, number> = {
  'domingo': 0, 'lunes': 1, 'martes': 2, 'miércoles': 3, 'miercoles': 3,
  'jueves': 4, 'viernes': 5, 'sábado': 6, 'sabado': 6,
};

function formatDateSpanish(date: Date): string {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${days[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]}`;
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, '0')} ${suffix}`;
}

function generateSlots(schedule: Record<string, any>, dayKey: string, durationMin: number): string[] {
  const blocks = schedule[dayKey];
  if (!blocks || (Array.isArray(blocks) && blocks.length === 0) || blocks === null) return [];

  const blockList = Array.isArray(blocks) ? blocks : [blocks];
  const slots: string[] = [];

  for (const block of blockList) {
    if (!block || !block.start || !block.end) continue;
    const [startH, startM] = block.start.split(':').map(Number);
    const [endH, endM] = block.end.split(':').map(Number);

    let currentMin = startH * 60 + startM;
    const endTotalMin = endH * 60 + endM;

    while (currentMin + durationMin <= endTotalMin) {
      const h = Math.floor(currentMin / 60);
      const m = currentMin % 60;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      currentMin += durationMin;
    }
  }

  return slots;
}

// ── Tool Implementations ───────────────────────────────────────────

/** Shift a YYYY-MM-DD date string to the next calendar day */
function getNextBusinessDay(dateStr: string, _doctorId: string): string {
  const d = new Date(`${dateStr}T12:00:00-06:00`); // noon to avoid DST edge cases
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function checkAvailability(
  dateStr: string,
  doctorId: string,
  defaultDuration: number
): Promise<AvailabilityResult> {
  console.log(`[SinergIA] checkAvailability called: date=${dateStr}, doctorId=${doctorId}, duration=${defaultDuration}`);
  try {
    const formatterDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric', month: '2-digit', day: '2-digit'
    });

    // Determine today's date in Mexico City timezone
    const now = new Date();
    const todayMx = formatterDateStr.format(now);

    // POLICY: No same-day appointments. If date is today, shift to next business day.
    let effectiveDateStr = dateStr;
    if (effectiveDateStr === todayMx) {
      console.log(`[SinergIA] Same-day appointment requested (${effectiveDateStr}). Shifting to next business day.`);
      effectiveDateStr = getNextBusinessDay(effectiveDateStr, doctorId);
    }

    const targetDate = new Date(`${effectiveDateStr}T00:00:00-06:00`);
    if (isNaN(targetDate.getTime())) {
      return { available: false, slots: [], dateFormatted: dateStr, message: 'Fecha no válida.' };
    }

    const doctorSnap = await getAdminDb().collection('users').doc(doctorId).get();
    if (!doctorSnap.exists) {
      return { available: false, slots: [], dateFormatted: dateStr, message: 'Doctor no encontrado.' };
    }

    const doctor = doctorSnap.data()!;
    const schedule = doctor.schedule || {};
    const blockedDays: string[] = doctor.blockedDays || [];

    // Try up to 7 days to find a day with schedule (skip blocked/closed days)
    let attempts = 0;
    let currentDateStr = effectiveDateStr;
    let currentDate = targetDate;
    let dayKey = dayNameMapping[currentDate.getDay()];

    while (attempts < 7) {
      const isBlocked = blockedDays.includes(currentDateStr);
      const daySlots = generateSlots(schedule, dayKey, defaultDuration);

      if (!isBlocked && daySlots.length > 0) {
        break; // Found a valid day
      }

      // Move to next day
      console.log(`[SinergIA] ${currentDateStr} (${dayKey}) is blocked or closed. Trying next day.`);
      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
      currentDateStr = formatterDateStr.format(currentDate);
      dayKey = dayNameMapping[currentDate.getDay()];
      attempts++;
    }

    if (attempts >= 7) {
      return {
        available: false, slots: [],
        dateFormatted: formatDateSpanish(targetDate),
        message: 'No se encontró disponibilidad en los próximos 7 días.'
      };
    }

    // Update targetDate to the valid day found
    const finalDate = new Date(`${currentDateStr}T00:00:00-06:00`);
    const finalDayKey = dayNameMapping[finalDate.getDay()];

    const allSlots = generateSlots(schedule, finalDayKey, defaultDuration);
    console.log(`[SinergIA] generateSlots for ${finalDayKey} (${currentDateStr}): ${allSlots.length} total slots. First: ${allSlots[0] || 'none'}, Last: ${allSlots[allSlots.length - 1] || 'none'}`);
    if (allSlots.length === 0) {
      return {
        available: false, slots: [],
        dateFormatted: formatDateSpanish(targetDate),
        message: `No hay horario de consulta el ${formatDateSpanish(targetDate)}.`
      };
    }

    const dayStart = new Date(`${currentDateStr}T00:00:00-06:00`);
    const dayEnd = new Date(`${currentDateStr}T23:59:59-06:00`);

    const bookedSlots = new Set<string>();

    // Simple date-range query — NO composite index needed.
    // Filter doctorId and status in memory to avoid FAILED_PRECONDITION.
    const existingSnap = await getAdminDb().collection('appointments')
      .where('date', '>=', dayStart)
      .where('date', '<=', dayEnd)
      .get();

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Mexico_City',
      hour: '2-digit', minute: '2-digit', hour12: false
    });

    existingSnap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const appt = doc.data();
      // In-memory filters: only this doctor + active statuses
      if (appt.doctorId !== doctorId) return;
      if (appt.status !== 'scheduled' && appt.status !== 'confirmed') return;

      const apptDate: Date = appt.date.toDate();
      const parts = timeFormatter.formatToParts(apptDate);
      const hStr = parts.find(p => p.type === 'hour')?.value || '00';
      const mStr = parts.find(p => p.type === 'minute')?.value || '00';
      const h = hStr === '24' ? '00' : hStr;
      bookedSlots.add(`${h}:${mStr}`);
    });
    console.log(`[SinergIA] Booked slots for ${currentDateStr}:`, Array.from(bookedSlots));

    // No need for isToday past-slot filter since we always schedule for future days
    const available = allSlots.filter(slot => !bookedSlots.has(slot));

    const formatted = formatDateSpanish(finalDate);

    if (available.length === 0) {
      return {
        available: false, slots: [],
        dateFormatted: formatted,
        message: `No quedan horarios disponibles el ${formatted}. Todos están ocupados.`
      };
    }

    // MORNING / AFTERNOON — aligned with prompt: mañana = before 12:00, tarde = 12:00+
    available.sort();
    const morningSlots = available.filter(t => parseInt(t.split(':')[0]) < 12);
    const afternoonSlots = available.filter(t => parseInt(t.split(':')[0]) >= 12);

    const suggestedSlots: string[] = [];
    if (morningSlots.length > 0) suggestedSlots.push(morningSlots[0]);
    if (afternoonSlots.length > 0) suggestedSlots.push(afternoonSlots[0]);

    // If only one turn available, pad to 2 options
    if (suggestedSlots.length < 2) {
      const remaining = available.filter(s => !suggestedSlots.includes(s));
      if (remaining.length > 0) suggestedSlots.push(remaining[0]);
    }

    suggestedSlots.sort();

    const suggested = suggestedSlots.map(s => ({
      time: s,
      formatted: formatTime12h(s),
      period: parseInt(s.split(':')[0]) < 12 ? 'mañana' : 'tarde',
    }));

    const suggestedText = suggested.map(s => `${s.formatted} (${s.period})`).join(' y ');

    return {
      available: true,
      slots: suggestedSlots,
      dateFormatted: formatted,
      message: `Horarios disponibles el ${formatted}: ${suggestedText}.`,
      suggested,
    };
  } catch (error: any) {
    console.error('[SinergIA] checkAvailability error:', error);
    return { available: false, slots: [], dateFormatted: dateStr, message: 'Error al consultar disponibilidad.' };
  }
}

export async function createAppointment(args: {
  patientName: string;
  patientPhone: string;
  patientId?: string | null;
  date: string;
  time: string;
  duration: number;
  doctorId: string;
  doctorName: string;
  officeId: string;
  reason?: string;
}): Promise<AppointmentResult> {
  console.log(`[SinergIA] createAppointment called:`, JSON.stringify({ patientName: args.patientName, date: args.date, time: args.time, doctorId: args.doctorId }));
  try {
    const appointmentDate = new Date(`${args.date}T${args.time}:00-06:00`);

    // Duplicate-check: simple date-range query, no composite index needed.
    const dayStart = new Date(`${args.date}T00:00:00-06:00`);
    const dayEnd = new Date(`${args.date}T23:59:59-06:00`);

    const existing = await getAdminDb().collection('appointments')
      .where('date', '>=', dayStart)
      .where('date', '<=', dayEnd)
      .get();

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Mexico_City',
      hour: '2-digit', minute: '2-digit', hour12: false
    });

    const isSlotTaken = existing.docs.some((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      if (data.doctorId !== args.doctorId) return false;
      if (data.status !== 'scheduled' && data.status !== 'confirmed') return false;

      const d: Date = data.date.toDate();
      const parts = timeFormatter.formatToParts(d);
      const hStr = parts.find(p => p.type === 'hour')?.value || '00';
      const mStr = parts.find(p => p.type === 'minute')?.value || '00';
      const docH = hStr === '24' ? 0 : parseInt(hStr, 10);
      const docM = parseInt(mStr, 10);

      const [argH, argM] = args.time.split(':').map(Number);
      return docH === argH && docM === argM;
    });

    if (isSlotTaken) {
      return { success: false, message: 'Ese horario acaba de ser ocupado. Intenta con otro.' };
    }

    const type = args.patientId ? 'subsecuente' : 'primera-vez';

    const docRef = await getAdminDb().collection('appointments').add({
      patientName: args.patientName,
      patientPhone: args.patientPhone,
      patientId: args.patientId || null,
      date: appointmentDate,
      duration: args.duration,
      type,
      status: 'scheduled',
      office: args.officeId,
      doctorId: args.doctorId,
      doctorName: args.doctorName,
      reason: args.reason || '',
      source: 'whatsapp-bot',
      notes: '',
      createdAt: FieldValue.serverTimestamp(),
    });

    const formatted = formatDateSpanish(appointmentDate);
    const timeStr = formatTime12h(args.time);

    return {
      success: true,
      appointmentId: docRef.id,
      message: `Cita creada para ${args.patientName} el ${formatted} a las ${timeStr} (${args.duration} min).`
    };
  } catch (error: any) {
    console.error('[SinergIA] createAppointment error:', error);
    return { success: false, message: 'Error al crear la cita. Intenta de nuevo.' };
  }
}

export async function getUpcomingAppointments(
  phone: string,
  countryCode: string
): Promise<{ appointments: UpcomingAppointment[]; message: string }> {
  try {
    const phonesToCheck = normalizePhoneVariants(phone, countryCode);

    const now = new Date();
    let allAppointments: UpcomingAppointment[] = [];

    for (const phoneVariant of phonesToCheck) {
      const snap = await getAdminDb().collection('appointments')
        .where('patientPhone', '==', phoneVariant)
        .get();

      // Filter in-memory to avoid needing composite indexes (patientPhone + status + date) across multiple projects
      let validDocs = snap.docs.filter(doc => {
        const data = doc.data();
        if (data.status !== 'scheduled' && data.status !== 'confirmed') return false;
        const d: Date = data.date.toDate();
        if (d < now) return false;
        return true;
      });

      // Sort ascending by date and take first 5
      validDocs.sort((a, b) => a.data().date.toMillis() - b.data().date.toMillis());
      validDocs = validDocs.slice(0, 5);

      for (const doc of validDocs) {
        const data = doc.data();
        const d: Date = data.date.toDate();
        const mxTimeParts = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Mexico_City',
          hour: '2-digit', minute: '2-digit', hour12: false,
        }).formatToParts(d);
        const hStr = mxTimeParts.find(p => p.type === 'hour')?.value || '00';
        const mStr = mxTimeParts.find(p => p.type === 'minute')?.value || '00';
        const h24 = hStr === '24' ? '00' : hStr;
        allAppointments.push({
          id: doc.id,
          patientName: data.patientName,
          date: d.toISOString(),
          dateFormatted: formatDateSpanish(d),
          timeFormatted: formatTime12h(`${h24}:${mStr}`),
          duration: data.duration,
          status: data.status,
          office: data.office,
        });
      }
    }

    const seen = new Set<string>();
    allAppointments = allAppointments.filter(a => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });

    if (allAppointments.length === 0) {
      return { appointments: [], message: 'No tienes citas próximas agendadas.' };
    }

    const lines = allAppointments.map(a =>
      `${a.dateFormatted} a las ${a.timeFormatted} (${a.status === 'confirmed' ? 'Confirmada' : 'Agendada'})`
    );

    return {
      appointments: allAppointments,
      message: `${allAppointments.length} cita(s) próxima(s): ${lines.join(', ')}`
    };
  } catch (error: any) {
    console.error('[SinergIA] getUpcomingAppointments error:', error);
    return { appointments: [], message: 'Error al consultar citas.' };
  }
}

export async function cancelAppointment(appointmentId: string): Promise<AppointmentResult> {
  try {
    const ref = getAdminDb().collection('appointments').doc(appointmentId);
    const snap = await ref.get();

    if (!snap.exists) {
      return { success: false, message: 'No se encontró la cita.' };
    }

    await ref.update({ status: 'cancelled' });

    return { success: true, appointmentId, message: 'Cita cancelada.' };
  } catch (error: any) {
    console.error('[SinergIA] cancelAppointment error:', error);
    return { success: false, message: 'Error al cancelar la cita.' };
  }
}

export async function confirmAppointment(appointmentId: string): Promise<AppointmentResult> {
  try {
    const ref = getAdminDb().collection('appointments').doc(appointmentId);
    const snap = await ref.get();

    if (!snap.exists) {
      return { success: false, message: 'No se encontró la cita.' };
    }

    await ref.update({ status: 'confirmed' });

    return { success: true, appointmentId, message: 'Cita confirmada.' };
  } catch (error: any) {
    console.error('[SinergIA] confirmAppointment error:', error);
    return { success: false, message: 'Error al confirmar la cita.' };
  }
}

export async function escalateToHuman(phone: string, reason: string): Promise<{ message: string }> {
  try {
    const conversationRef = getAdminDb().collection('whatsapp-conversations').doc(phone);

    await conversationRef.set({
      humanTakeover: true,
      humanTakeoverAt: FieldValue.serverTimestamp(),
      needsAttention: true,
      escalationReason: reason,
    }, { merge: true });

    // Internal confirmation only — the prompt controls what the patient sees
    return { message: 'Escalación activada. La conversación fue transferida al equipo humano.' };
  } catch (error: any) {
    console.error('[SinergIA] escalateToHuman error:', error);
    return { message: 'Escalación activada con error parcial. El equipo fue notificado.' };
  }
}

// ── Unified Patient Cache ──────────────────────────────────────────

interface CachedPatient {
  id: string;
  name: string;
  firstName: string;
  dob?: string;
  age?: string;
  tutorName?: string;
  tutorPhone?: string;
  nameNorm: string;
}

let patientsCache: CachedPatient[] = [];
let phoneIndex: Map<string, CachedPatient[]> = new Map();
let lastCacheTime = 0;

function calcPatientAge(dob?: string): string {
  if (!dob) return '';
  const birth = new Date(dob + 'T00:00:00');
  if (isNaN(birth.getTime())) return '';
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (now.getDate() < birth.getDate()) { months--; if (months < 0) { years--; months += 12; } }
  if (years < 0) return '';
  if (years === 0) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  if (months === 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
  return `${years}a ${months}m`;
}

const norm = (s: string) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";

function shouldRefreshCache(): boolean {
  if (patientsCache.length === 0) return true;

  const now = new Date();
  const mxParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);

  const h = parseInt(mxParts.find(p => p.type === 'hour')?.value || '0', 10);
  const dateStr = `${mxParts.find(p => p.type === 'year')?.value}-${mxParts.find(p => p.type === 'month')?.value}-${mxParts.find(p => p.type === 'day')?.value}`;

  let lastScheduled: Date;
  if (h >= 20) {
    lastScheduled = new Date(`${dateStr}T20:00:00-06:00`);
  } else if (h >= 9) {
    lastScheduled = new Date(`${dateStr}T09:00:00-06:00`);
  } else {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(yesterday);
    const yDate = `${yParts.find(p => p.type === 'year')?.value}-${yParts.find(p => p.type === 'month')?.value}-${yParts.find(p => p.type === 'day')?.value}`;
    lastScheduled = new Date(`${yDate}T20:00:00-06:00`);
  }

  return lastCacheTime < lastScheduled.getTime();
}

export function invalidateCache(): void {
  lastCacheTime = 0;
  console.log('[SinergIA Cache] Cache invalidated.');
}

async function ensureCacheLoaded(): Promise<void> {
  if (!shouldRefreshCache()) return;

  try {
    const snap = await Promise.race([
      getAdminDb().collection('patients').limit(2000).get(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Firestore cache timeout')), 8000)),
    ]);

    const newCache: CachedPatient[] = [];
    const newPhoneIndex = new Map<string, CachedPatient[]>();

    for (const doc of (snap as FirebaseFirestore.QuerySnapshot).docs) {
      const data = doc.data();
      const patientData = { ...data, id: doc.id };
      const name = getPatientFullName(patientData);
      const dobRaw = data.dob ? (data.dob.toDate ? data.dob.toDate().toISOString().split('T')[0] : data.dob) : undefined;

      const cached: CachedPatient = {
        id: doc.id,
        name,
        firstName: data.firstName || '',
        dob: dobRaw,
        age: calcPatientAge(dobRaw),
        tutorName: data.guardianName || '',
        tutorPhone: data.whatsappPhone || data.phone || data.guardianPhone || '',
        nameNorm: norm(name),
      };

      newCache.push(cached);

      if (cached.tutorPhone) {
        const digits = cached.tutorPhone.replace(/\D/g, '');
        if (digits.length >= 7) {
          const variants = new Set<string>();
          variants.add(digits);

          if (digits.startsWith('52')) {
            const local = digits.slice(2);
            variants.add(local);
            if (local.startsWith('1') && local.length === 11) {
              variants.add(local.slice(1));
              variants.add('52' + local.slice(1));
            }
          } else if (digits.length === 10) {
            variants.add('52' + digits);
            variants.add('521' + digits);
          } else if (digits.startsWith('1') && digits.length === 11) {
            variants.add(digits.slice(1));
            variants.add('52' + digits.slice(1));
            variants.add('52' + digits);
          }

          for (const v of variants) {
            const existing = newPhoneIndex.get(v) || [];
            if (!existing.some(p => p.id === cached.id)) {
              existing.push(cached);
            }
            newPhoneIndex.set(v, existing);
          }
        }
      }
    }

    patientsCache = newCache;
    phoneIndex = newPhoneIndex;
    lastCacheTime = Date.now();
    console.log(`[SinergIA Cache] ${newCache.length} patients, ${newPhoneIndex.size} phone variants.`);
  } catch (error: any) {
    console.error('[SinergIA Cache] Error:', error.message);
  }
}

// ── Patient Lookup Functions ───────────────────────────────────────

export interface PhonePatientResult {
  id: string;
  name: string;
  dob?: string;
  age?: string;
  tutorName?: string;
  tutorPhone?: string;
}

export async function findPatientsByPhone(
  phone: string,
  countryCode: string
): Promise<PhonePatientResult[]> {
  try {
    await ensureCacheLoaded();

    const clean = phone.replace(/\D/g, '');
    const codeDigits = countryCode.replace('+', '');

    const variants = new Set<string>();
    variants.add(clean);
    if (clean.startsWith(codeDigits)) {
      const local = clean.slice(codeDigits.length);
      variants.add(local);
      if (codeDigits === '52' && local.startsWith('1')) {
        variants.add(local.slice(1));
        variants.add('52' + local.slice(1));
      }
    }
    if (!clean.startsWith(codeDigits)) {
      variants.add(codeDigits + clean);
      if (codeDigits === '52' && clean.length === 10) {
        variants.add('521' + clean);
      }
    }

    for (const v of variants) {
      const matches = phoneIndex.get(v);
      if (matches && matches.length > 0) {
        console.log(`[SinergIA] Phone match: ${v} → ${matches.length} patient(s)`);
        return matches.map(m => ({
          id: m.id,
          name: m.name,
          dob: m.dob,
          age: m.age,
          tutorName: m.tutorName,
          tutorPhone: m.tutorPhone,
        }));
      }
    }

    return [];
  } catch (error: any) {
    console.error('[SinergIA] findPatientsByPhone error:', error);
    return [];
  }
}

/** @deprecated Use findPatientsByPhone instead */
export async function findPatientByPhone(
  phone: string,
  countryCode: string
): Promise<PhonePatientResult | null> {
  const results = await findPatientsByPhone(phone, countryCode);
  return results.length > 0 ? results[0] : null;
}

export async function searchPatientByName(
  nameQuery: string
): Promise<{ id: string; name: string; contextMessage: string }[]> {
  try {
    const qLower = norm(nameQuery);
    await ensureCacheLoaded();

    const matches: { id: string; name: string; contextMessage: string }[] = [];

    for (const p of patientsCache) {
      if (p.nameNorm.includes(qLower)) {
        const ageStr = p.age ? ` (${p.age})` : '';
        matches.push({
          id: p.id,
          name: p.name,
          contextMessage: `Encontrado: ${p.name}${ageStr}. ID: ${p.id}.`
        });
      }
    }

    return matches.slice(0, 5);
  } catch (error: any) {
    console.error('[SinergIA] searchPatientByName error:', error);
    return [];
  }
}

// ── Phone normalization ────────────────────────────────────────────

function normalizePhoneVariants(phone: string, countryCode: string): string[] {
  const clean = phone.replace(/[^0-9+]/g, '');
  const codeDigits = countryCode.replace('+', '');

  const variants = new Set<string>();
  variants.add(clean);
  variants.add(clean.replace(/^\+/, ''));
  variants.add(`+${clean.replace(/^\+/, '')}`);

  if (clean.startsWith(codeDigits)) {
    const local = clean.slice(codeDigits.length);
    variants.add(local);
    variants.add(`+${clean}`);

    if (codeDigits === '52' && local.startsWith('1')) {
      const mxLocal = local.slice(1);
      variants.add(mxLocal);
      variants.add(`52${mxLocal}`);
      variants.add(`+52${mxLocal}`);
    }
  }
  if (clean.startsWith(`+${codeDigits}`)) {
    const local = clean.slice(codeDigits.length + 1);
    variants.add(local);
    variants.add(clean.replace(/^\+/, ''));

    if (codeDigits === '52' && local.startsWith('1')) {
      const mxLocal = local.slice(1);
      variants.add(mxLocal);
      variants.add(`52${mxLocal}`);
      variants.add(`+52${mxLocal}`);
    }
  }

  if (!clean.startsWith(codeDigits) && !clean.startsWith(`+${codeDigits}`)) {
    variants.add(`${codeDigits}${clean}`);
    variants.add(`+${codeDigits}${clean}`);

    if (codeDigits === '52' && clean.replace(/^\+/, '').length === 10) {
      variants.add(`521${clean.replace(/^\+/, '')}`);
      variants.add(`+521${clean.replace(/^\+/, '')}`);
    }
  }

  return Array.from(variants);
}

// ── Gemini Tool Declarations ───────────────────────────────────────

export const toolDeclarations = [
  {
    name: 'search_patient_by_name',
    description: 'Busca pacientes en la base de datos por nombre completo o parcial.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        nameQuery: {
          type: SchemaType.STRING,
          description: 'Nombre o parte del nombre a buscar.'
        }
      },
      required: ['nameQuery'],
    },
  },
  {
    name: 'check_availability',
    description: 'Consulta horarios disponibles del doctor para una fecha. Devuelve 2 opciones sugeridas (mañana y tarde). Ejecutar de inmediato sin avisarle al paciente.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: {
          type: SchemaType.STRING,
          description: 'Fecha en formato YYYY-MM-DD. Si el paciente no especifica, usar la fecha de hoy.'
        }
      },
      required: ['date'],
    },
  },
  {
    name: 'create_appointment',
    description: 'OBLIGATORIO para agendar una cita. Sin esta llamada, la cita NO existe en el sistema. Cuando el paciente confirme fecha y hora, DEBES llamar esta función para que la cita se registre. Si no la llamas, la cita NO se crea.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        patientName: {
          type: SchemaType.STRING,
          description: 'Nombre completo del paciente.'
        },
        date: {
          type: SchemaType.STRING,
          description: 'Fecha en formato YYYY-MM-DD.'
        },
        time: {
          type: SchemaType.STRING,
          description: 'Hora en formato HH:mm (24h).'
        },
        reason: {
          type: SchemaType.STRING,
          description: 'Motivo de la consulta (opcional).'
        }
      },
      required: ['patientName', 'date', 'time'],
    },
  },
  {
    name: 'get_upcoming_appointments',
    description: 'Obtiene las próximas citas del paciente actual.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'cancel_appointment',
    description: 'Cancela una cita por su ID. Usar get_upcoming_appointments primero para obtener el ID.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        appointmentId: {
          type: SchemaType.STRING,
          description: 'ID de la cita a cancelar.'
        }
      },
      required: ['appointmentId'],
    },
  },
  {
    name: 'confirm_appointment',
    description: 'Confirma asistencia a una cita existente.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        appointmentId: {
          type: SchemaType.STRING,
          description: 'ID de la cita a confirmar.'
        }
      },
      required: ['appointmentId'],
    },
  },
  {
    name: 'escalate_to_human',
    description: 'Transfiere la conversación al equipo humano. Usar para urgencias médicas, quejas o solicitudes fuera de alcance.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        reason: {
          type: SchemaType.STRING,
          description: 'Razón interna de la escalación (no visible al paciente).'
        }
      },
      required: ['reason'],
    },
  },
  {
    name: 'link_patient_phone',
    description: 'Vincula un número de teléfono a la conversación actual. Usar cuando el paciente proporcione su número por primera vez.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        phoneNumber: {
          type: SchemaType.STRING,
          description: 'Número a 10 dígitos proporcionado por el paciente.'
        }
      },
      required: ['phoneNumber'],
    },
  },
];