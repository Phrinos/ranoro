'use server';
/**
 * @fileOverview Flow de Chat Inteligente Unificado para Ranoro.
 * 
 * - sendChatMessage - Función principal para interactuar con el asistente.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { startOfMonth, endOfMonth, isValid, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

// --- Helper para manejar fechas de Firestore ---
const parseDate = (dateVal: any): Date => {
  if (!dateVal) return new Date();
  if (typeof dateVal.toDate === 'function') return dateVal.toDate();
  if (typeof dateVal === 'object' && (dateVal.seconds !== undefined || dateVal._seconds !== undefined)) {
    const seconds = dateVal.seconds ?? dateVal._seconds;
    const nanoseconds = dateVal.nanoseconds ?? dateVal._nanoseconds ?? 0;
    return new Date(seconds * 1000 + nanoseconds / 1000000);
  }
  const d = new Date(dateVal);
  return isValid(d) ? d : new Date();
};

// --- Herramientas de Datos (Tools) ---

const getServiceReport = ai.defineTool(
  {
    name: 'getServiceReport',
    description: 'Consulta reporte de servicios, afinaciones o trabajos realizados en un periodo.',
    inputSchema: z.object({ 
      serviceType: z.string().optional().describe('Tipo de servicio, ej: "Afinación"'),
      month: z.number().min(1).max(12).optional().describe('Mes numérico (1-12)'),
      year: z.number().optional().describe('Año (ej: 2024)')
    }),
    outputSchema: z.object({
      totalCount: z.number(),
      services: z.array(z.object({
        vehicle: z.string(),
        total: z.number(),
        date: z.string()
      })),
      summary: z.string()
    }),
  },
  async ({ serviceType, month, year }) => {
    const db = getAdminDb();
    const now = new Date();
    const targetMonth = month ? month - 1 : now.getMonth();
    const targetYear = year || now.getFullYear();
    
    const start = startOfMonth(new Date(targetYear, targetMonth));
    const end = endOfMonth(start);

    const servicesSnap = await db.collection('serviceRecords')
        .where('status', '==', 'Entregado')
        .get();
    
    let filtered = servicesSnap.docs.map(doc => {
      const data = doc.data();
      const dateObj = parseDate(data.deliveryDateTime || data.serviceDate || data.createdAt);

      return {
        id: doc.id,
        name: (data.serviceItems?.[0]?.name || 'Servicio').toString(),
        vehicle: (data.vehicleIdentifier || 'Vehículo').toString(),
        total: Number(data.totalCost || data.total || 0),
        dateObj: dateObj
      };
    }).filter(s => isWithinInterval(s.dateObj, { start, end }));

    if (serviceType) {
      const q = serviceType.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
    }

    const totalRevenue = filtered.reduce((sum, s) => sum + s.total, 0);

    return {
      totalCount: filtered.length,
      services: filtered.slice(0, 10).map(s => ({
        vehicle: s.vehicle,
        total: s.total,
        date: s.dateObj.toISOString().split('T')[0]
      })),
      summary: `Encontré ${filtered.length} servicios en el periodo. Ingreso total: $${totalRevenue}.`
    };
  }
);

const getFinancialStats = ai.defineTool(
  {
    name: 'getFinancialStats',
    description: 'Obtiene el balance financiero (ingresos vs gastos) y margen de utilidad del taller.',
    inputSchema: z.object({
      month: z.number().min(1).max(12).optional(),
      year: z.number().optional(),
      startDate: z.string().optional().describe('Formato YYYY-MM-DD'),
      endDate: z.string().optional().describe('Formato YYYY-MM-DD'),
    }),
    outputSchema: z.object({ 
      totalIncome: z.number(), 
      totalExpenses: z.number(), 
      netProfit: z.number(),
      marginPct: z.number().nullable(),
      period: z.object({ start: z.string(), end: z.string() })
    }),
  },
  async ({ month, year, startDate, endDate }) => {
    const db = getAdminDb();
    const now = new Date();

    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = startOfDay(new Date(startDate + "T00:00:00"));
      end = endOfDay(new Date(endDate + "T23:59:59.999"));
    } else if (year && !month) {
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31, 23, 59, 59, 999);
    } else {
      const targetMonth = month ? month - 1 : now.getMonth();
      const targetYear = year || now.getFullYear();
      start = startOfMonth(new Date(targetYear, targetMonth));
      end = endOfMonth(start);
    }

    const servicesSnap = await db.collection('serviceRecords')
      .where('status', '==', 'Entregado')
      .get();

    const income = servicesSnap.docs.reduce((sum, doc) => {
        const data = doc.data();
        const date = parseDate(data.deliveryDateTime || data.serviceDate);
        if (date && isWithinInterval(date, { start, end })) {
            return sum + (Number(data.totalCost || data.total || 0));
        }
        return sum;
    }, 0);

    const cashSnap = await db.collection('cashDrawerTransactions')
      .where('type', 'in', ['out', 'Salida', 'expense'])
      .get();

    const expenses = cashSnap.docs.reduce((sum, doc) => {
        const data = doc.data();
        const date = parseDate(data.date);
        if (date && isWithinInterval(date, { start, end })) {
            return sum + (Number(data.amount) || 0);
        }
        return sum;
    }, 0);

    const netProfit = income - expenses;
    const marginPct = income > 0 ? Math.round((netProfit / income) * 1000) / 10 : null;

    return { 
      totalIncome: income, 
      totalExpenses: expenses, 
      netProfit, 
      marginPct,
      period: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      }
    };
  }
);

const getInventoryStatus = ai.defineTool(
  {
    name: 'getInventoryStatus',
    description: 'Consulta productos con bajo stock o el valor total del inventario.',
    inputSchema: z.object({ onlyLowStock: z.boolean().optional() }),
    outputSchema: z.array(z.object({ name: z.string(), stock: z.number(), threshold: z.number() })),
  },
  async ({ onlyLowStock }) => {
    const db = getAdminDb();
    const snap = await db.collection('inventory').get();
    
    let items = snap.docs.map(doc => ({ 
        name: (doc.data().name || 'Item').toString(), 
        stock: Number(doc.data().quantity || 0), 
        threshold: Number(doc.data().lowStockThreshold || 0) 
    }));

    if (onlyLowStock) {
        items = items.filter(it => it.stock <= it.threshold);
    }

    return items.sort((a, b) => a.stock - b.stock).slice(0, 15);
  }
);

const getTopVehiclesByServiceType = ai.defineTool(
  {
    name: 'getTopVehiclesByServiceType',
    description: 'Top vehículos atendidos por tipo de servicio (ej. Afinación), con ticket promedio y margen de ganancia estimado o real.',
    inputSchema: z.object({
      serviceType: z.string().optional().describe('Ej: "Afinación"'),
      month: z.number().min(1).max(12).optional(),
      year: z.number().optional(),
      startDate: z.string().optional().describe('YYYY-MM-DD'),
      endDate: z.string().optional().describe('YYYY-MM-DD'),
      topN: z.number().min(1).max(50).optional().default(10),
    }),
    outputSchema: z.object({
      period: z.object({ start: z.string(), end: z.string() }),
      serviceType: z.string(),
      totals: z.object({
        totalServices: z.number(),
        totalIncome: z.number(),
        totalExpenses: z.number(),
        overallMarginPct: z.number().nullable(),
        marginMode: z.enum(['real', 'estimated', 'mixed']),
      }),
      vehicles: z.array(
        z.object({
          vehicle: z.string(),
          count: z.number(),
          totalRevenue: z.number(),
          avgTicket: z.number(),
          avgMarginPct: z.number().nullable(),
          marginMode: z.enum(['real', 'estimated', 'mixed']),
        })
      ),
      notes: z.array(z.string()),
    }),
  },
  async ({ serviceType, month, year, startDate, endDate, topN = 10 }) => {
    const db = getAdminDb();
    const now = new Date();

    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = startOfDay(new Date(startDate + 'T00:00:00'));
      end = endOfDay(new Date(endDate + 'T23:59:59.999'));
    } else {
      const targetMonth = month ? month - 1 : now.getMonth();
      const targetYear = year || now.getFullYear();
      start = startOfMonth(new Date(targetYear, targetMonth));
      end = endOfMonth(start);
    }

    const q = (serviceType || 'Afinación').toLowerCase();

    const servicesSnap = await db.collection('serviceRecords')
      .where('status', '==', 'Entregado')
      .get();

    const services = servicesSnap.docs
      .map(doc => {
        const data = doc.data();
        const dateObj = parseDate(data.deliveryDateTime || data.serviceDate || data.createdAt);
        const items = Array.isArray(data.serviceItems) ? data.serviceItems : [];

        const matchesType =
          items.some((it: any) => (it?.name || '').toString().toLowerCase().includes(q)) ||
          (data.serviceType || '').toString().toLowerCase().includes(q) ||
          (data.name || '').toString().toLowerCase().includes(q);

        const total = Number(data.totalCost || data.total || 0);
        
        // Simulación de COGS si no existen en el doc
        const realCogs = Number(data.cogsTotal || data.costTotal || 0);

        const vehicle =
          (data.vehicleIdentifier || '').toString().trim() ||
          [data.vehicleMake, data.vehicleModel, data.vehicleYear].filter(Boolean).join(' ').trim() ||
          'Vehículo (sin identificar)';

        return { id: doc.id, dateObj, matchesType, total, realCogs, vehicle };
      })
      .filter(s => s.matchesType && isWithinInterval(s.dateObj, { start, end }));

    const totalIncome = services.reduce((sum, s) => sum + s.total, 0);

    const cashSnap = await db.collection('cashDrawerTransactions')
      .where('type', 'in', ['out', 'Salida', 'expense'])
      .get();

    const totalExpenses = cashSnap.docs.reduce((sum, doc) => {
      const data = doc.data();
      const d = parseDate(data.date || data.createdAt);
      if (isWithinInterval(d, { start, end })) return sum + (Number(data.amount) || 0);
      return sum;
    }, 0);

    const overallMarginPct = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 1000) / 10 : null;
    const overallExpenseRatio = totalIncome > 0 ? totalExpenses / totalIncome : 0;

    const map = new Map<string, any>();

    for (const s of services) {
      const entry = map.get(s.vehicle) || {
        vehicle: s.vehicle,
        count: 0,
        totalRevenue: 0,
        realMarginSum: 0,
        realCount: 0,
      };

      entry.count += 1;
      entry.totalRevenue += s.total;

      if (s.realCogs > 0) {
        const profit = s.total - s.realCogs;
        entry.realMarginSum += profit;
        entry.realCount += 1;
      }

      map.set(s.vehicle, entry);
    }

    const vehiclesList = Array.from(map.values())
      .map(v => {
        const avgTicket = v.count > 0 ? v.totalRevenue / v.count : 0;
        let avgMarginPct: number | null = null;
        let marginMode: 'real' | 'estimated' | 'mixed' = 'estimated';

        if (v.realCount > 0) {
          avgMarginPct = v.totalRevenue > 0 ? Math.round((v.realMarginSum / v.totalRevenue) * 1000) / 10 : 0;
          marginMode = v.realCount === v.count ? 'real' : 'mixed';
        } else {
          avgMarginPct = Math.round((1 - overallExpenseRatio) * 1000) / 10;
          marginMode = 'estimated';
        }

        return {
          vehicle: v.vehicle,
          count: v.count,
          totalRevenue: Number(v.totalRevenue.toFixed(2)),
          avgTicket: Number(avgTicket.toFixed(2)),
          avgMarginPct,
          marginMode: marginMode as "real" | "estimated" | "mixed",
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);

    const finalMarginMode = (services.every(s => s.realCogs > 0) ? 'real' : services.some(s => s.realCogs > 0) ? 'mixed' : 'estimated') as "real" | "estimated" | "mixed";

    return {
      period: { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] },
      serviceType: serviceType || 'Afinación',
      totals: {
        totalServices: services.length,
        totalIncome: Number(totalIncome.toFixed(2)),
        totalExpenses: Number(totalExpenses.toFixed(2)),
        overallMarginPct,
        marginMode: finalMarginMode,
      },
      vehicles: vehiclesList,
      notes: finalMarginMode === 'estimated' ? ['Los márgenes por vehículo son estimados basándose en los gastos generales del periodo.'] : [],
    };
  }
);

// --- Flow Principal ---

const MessageSchema = z.object({
    role: z.enum(['user', 'model']),
    content: z.string()
});

const WorkshopChatInputSchema = z.object({
  history: z.array(MessageSchema).optional(),
  message: z.string(),
});

const workshopChatFlow = ai.defineFlow(
  {
    name: 'workshopChatFlow',
    inputSchema: WorkshopChatInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const historyMessages = (input.history || []).map(m => ({
        role: m.role,
        content: [{ text: m.content }]
    }));

    const response = await ai.generate({
      system: `Eres el Asistente Inteligente de Ranoro, el experto administrativo del taller.
      Usa las herramientas para dar datos reales de la base de datos de Firestore.
      Responde siempre de forma amable, profesional, corta y en español (pesos mexicanos).
      Reglas:
      - Si el usuario pide margen, rentabilidad, utilidad o %: SIEMPRE llama getFinancialStats y reporta marginPct.
      - Si el usuario pide por año (ej. 2025) y no especifica mes: asume año completo.
      - Si el usuario pide: "vehículos más comunes", "promedio por vehículo", "top vehículos", "afinaciones por vehículo": usa getTopVehiclesByServiceType.
      - No inventes datos; si faltan egresos registrados, explica que el margen depende de cashDrawerTransactions.
      - Si el margen por vehículo es estimado, dilo explícitamente y explica por qué.`,
      messages: [
        ...historyMessages,
        { role: 'user', content: [{ text: input.message }] }
      ],
      tools: [getServiceReport, getFinancialStats, getInventoryStatus, getTopVehiclesByServiceType],
      maxTurns: 5,
      config: {
        temperature: 0.2,
      }
    });

    return response.text;
  }
);

/**
 * Función wrapper para interactuar con el asistente de chat.
 */
export async function sendChatMessage(message: string, history: any[] = []): Promise<string> {
    try {
        const cleanHistory = history.map(h => ({
            role: (h.role === 'user' ? 'user' : 'model') as 'user' | 'model',
            content: String(h.content)
        }));

        return await workshopChatFlow({ message, history: cleanHistory });
    } catch (error: any) {
        console.error("🔥 ERROR GENKIT SERVER:", error);
        throw new Error(`Error: ${error.message || "La IA no pudo responder. Verifica la configuración del modelo."}`);
    }
}
