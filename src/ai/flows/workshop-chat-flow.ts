'use server';
/**
 * @fileOverview Flow de Chat Inteligente Unificado para Ranoro.
 * 
 * - sendChatMessage - Función principal para interactuar con el asistente.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { startOfMonth, endOfMonth, isValid } from 'date-fns';

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
      month: z.number().optional().describe('Mes numérico (1-12)'),
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

    // Consulta optimizada directamente en Firestore
    const servicesSnap = await db.collection('serviceRecords')
        .where('status', '==', 'Entregado')
        .where('deliveryDateTime', '>=', start.toISOString())
        .where('deliveryDateTime', '<=', end.toISOString())
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
    });

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
    description: 'Obtiene el balance financiero (ingresos vs gastos) del taller en un periodo.',
    inputSchema: z.object({
      month: z.number().optional().describe('Mes numérico (1-12)'),
      year: z.number().optional().describe('Año (ej: 2024)')
    }),
    outputSchema: z.object({ totalIncome: z.number(), totalExpenses: z.number(), netProfit: z.number() }),
  },
  async ({ month, year }) => {
    const db = getAdminDb();
    const now = new Date();
    const targetMonth = month ? month - 1 : now.getMonth();
    const targetYear = year || now.getFullYear();
    
    const start = startOfMonth(new Date(targetYear, targetMonth));
    const end = endOfMonth(start);

    const servicesSnap = await db.collection('serviceRecords')
      .where('status', '==', 'Entregado')
      .where('deliveryDateTime', '>=', start.toISOString())
      .where('deliveryDateTime', '<=', end.toISOString())
      .get();

    const income = servicesSnap.docs.reduce((sum, doc) => sum + (Number(doc.data().totalCost || doc.data().total || 0)), 0);

    const cashSnap = await db.collection('cashDrawerTransactions')
      .where('type', 'in', ['out', 'Salida', 'expense'])
      .where('date', '>=', start.toISOString())
      .where('date', '<=', end.toISOString())
      .get();

    const expenses = cashSnap.docs.reduce((sum, doc) => sum + (Number(doc.data().amount) || 0), 0);

    return { totalIncome: income, totalExpenses: expenses, netProfit: income - expenses };
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
      Responde siempre de forma amable, profesional, corta y en español (pesos mexicanos).`,
      messages: [
        ...historyMessages,
        { role: 'user', content: [{ text: input.message }] }
      ],
      tools: [getServiceReport, getFinancialStats, getInventoryStatus],
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
            role: h.role === 'user' ? 'user' : 'model',
            content: String(h.content)
        }));

        return await workshopChatFlow({ message, history: cleanHistory as any });
    } catch (error: any) {
        console.error("🔥 ERROR GENKIT SERVER:", error);
        throw new Error(`Error técnico de IA: ${error.message || "No pude conectar con el servidor de inteligencia."}`);
    }
}
