/**
 * SinergIA WhatsApp Agent — System Prompt Builder v5
 *
 * v5: Simplified. All clinic-specific instructions (tone, pricing, rules, addresses)
 * live in customInstructions (Firestore). This file ONLY injects:
 *  - Dynamic context (date, time, duration, doctor ID)
 *  - Satellite schedule (programmatic, from admin panel)
 *  - Internal tool execution rule (must be code-level, not user-editable)
 */

export interface SatelliteDate {
  city: string;
  date: string;     // YYYY-MM-DD
  address: string;
}

export interface PromptContext {
  botName: string;
  clinicName: string;
  defaultDuration: number;
  today: string;
  currentTime: string;
  customInstructions: string;
  doctorId?: string;
  satelliteSchedule?: SatelliteDate[];
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const doctorId = ctx.doctorId ?? "5l9NxVQRjTMN6fmXi8g16QNQ5YH2";

  // ── 1. Custom instructions (the FULL prompt from Firestore) ─────
  const basePrompt =
    ctx.customInstructions.trim() ||
    `Eres ${ctx.botName}, asistente virtual en ${ctx.clinicName}. Ayuda a los pacientes a agendar citas.`;

  // ── 2. Dynamic context (changes every request) ──────────────────
  const dynamicContext = `

=== CONTEXTO DINÁMICO (generado automáticamente cada mensaje) ===
HOY: ${ctx.today}
HORA ACTUAL: ${ctx.currentTime}
DURACIÓN ESTÁNDAR DE CITA: ${ctx.defaultDuration} minutos
DOCTOR ID (interno, nunca mostrar al paciente): ${doctorId}`;

  // ── 3. Internal tool execution rule (code-level, not editable) ──
  const toolRule = `

=== REGLA INTERNA DE HERRAMIENTAS ===
Herramientas disponibles: check_availability, create_appointment, get_upcoming_appointments, cancel_appointment, confirm_appointment, escalate_to_human, search_patient_by_name, link_patient_phone.
Cuando necesites usar una herramienta, llámala DE INMEDIATO sin escribir nada antes. NUNCA digas que vas a ejecutar algo ni uses corchetes para describir acciones internas.
Una cita SOLO existe si ejecutas create_appointment. NUNCA digas que una cita está agendada sin haber ejecutado la herramienta.`;

  // ── 4. Satellite schedule (programmatic from admin panel) ───────
  let satelliteBlock = '';
  const schedule = ctx.satelliteSchedule || [];

  const todayISO = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const futureDates = schedule.filter(s => s.date >= todayISO);

  if (futureDates.length > 0) {
    const grouped: Record<string, SatelliteDate[]> = {};
    for (const s of futureDates) {
      if (!grouped[s.city]) grouped[s.city] = [];
      grouped[s.city].push(s);
    }

    const lines: string[] = [];
    for (const [city, dates] of Object.entries(grouped)) {
      const dateList = dates
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(d => d.date)
        .join(', ');
      const addr = dates[0].address;
      lines.push(`${city}: Fechas disponibles: ${dateList}. Dirección: ${addr}`);
    }

    satelliteBlock = `

=== AGENDA FORÁNEA (CIUDADES SATÉLITE) ===
El doctor visita otras ciudades en fechas específicas. SOLO puedes agendar citas en estas ciudades en las fechas listadas aquí.

Ciudades y fechas disponibles:
${lines.join('\n')}

Cuando un paciente de una ciudad satélite pida cita:
a) Verifica que la fecha solicitada coincida con una de las listadas.
b) Si coincide, usa check_availability con esa fecha.
c) Si NO coincide, dile cuál es la próxima fecha disponible.
d) Si no hay fechas futuras para esa ciudad, sugiere llamar a la clínica.
e) NUNCA inventes fechas de visita.

Si el paciente NO especifica ciudad, asume la sede principal en Durango.`;
  }

  return basePrompt + dynamicContext + toolRule + satelliteBlock;
}