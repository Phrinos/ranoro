'use server';
/**
 * @fileOverview Flow de Chat Inteligente Unificado para Ranoro.
 * Proporciona a Gemini acceso a herramientas para consultar datos reales del taller.
 *
 * - sendChatMessage - Función que maneja el proceso de chat con el asistente.
 * - WorkshopChatInput - El tipo de entrada para la función sendChatMessage.
 * - WorkshopChatOutput - El tipo de retorno para la función sendChatMessage.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminDb } from '@/lib/firebaseAdmin';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

// --- Esquemas de Datos ---

const MessageSchema = z.object({
    role: z.enum(['user', 'model', 'system']),
    content: z.string(),
});

const WorkshopChatInputSchema = z.object({
  history: z.array(MessageSchema).optional(),
  message: z.string(),
});
export type WorkshopChatInput = z.infer<typeof WorkshopChatInputSchema>;

export type WorkshopChatOutput = string;

// --- Herramientas de Datos para la IA ---

const getServiceReport = ai.defineTool(
  {
    name: 'getServiceReport',
    description: 'Consulta cuántos servicios de cierto tipo se han hecho o el volumen total de trabajos en un periodo.',
    inputSchema: z.object({ 
      serviceType: z.string().optional().describe('Tipo de servicio a buscar, ej: "Afinación"'),
      month: z.number().min(1).max(12).optional().describe('Mes (1-12) para filtrar'),
      year: z.number().optional().describe('Año para filtrar')
    }),
    outputSchema: z.object({
      totalCount: z.number(),
      services: z.array(z.object({
        id: z.string(),
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

    const servicesSnap = await db.collection('serviceRecords').where('status', '==', 'Entregado').get();
    
    let filtered = servicesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.serviceItems?.[0]?.name || 'Servicio',
        vehicle: data.vehicleIdentifier || 'Desconocido',
        total: data.totalCost || data.total || 0,
        date: data.deliveryDateTime || data.serviceDate
      };
    }).filter(s => {
      const d = new Date(s.date);
      return isWithinInterval(d, { start, end });
    });

    if (serviceType) {
      const q = serviceType.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
    }

    const totalRevenue = filtered.reduce((sum, s) => sum + s.total, 0);

    return {
      totalCount: filtered.length,
      services: filtered.slice(0, 10),
      summary: `Se encontraron ${filtered.length} servicios en el periodo, con un ingreso de $${totalRevenue}.`
    };
  }
);

const getFinancialStats = ai.defineTool(
  {
    name: 'getFinancialStats',
    description: 'Obtiene el balance financiero (ingresos vs gastos) del taller.',
    inputSchema: z.object({}),
    outputSchema: z.object({ totalIncome: z.number(), totalExpenses: z.number(), netProfit: z.number() }),
  },
  async () => {
    const db = getAdminDb();
    const servicesSnap = await db.collection('serviceRecords').where('status', '==', 'Entregado').get();
    const income = servicesSnap.docs.reduce((sum, doc) => sum + (doc.data().totalCost || 0), 0);

    const cashSnap = await db.collection('cashDrawerTransactions').where('type', '==', 'out').get();
    const expenses = cashSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

    return { totalIncome: income, totalExpenses: expenses, netProfit: income - expenses };
  }
);

const getInventoryStatus = ai.defineTool(
  {
    name: 'getInventoryStatus',
    description: 'Consulta productos con bajo stock o el valor total del inventario.',
    inputSchema: z.object({ onlyLowStock: z.boolean().optional().default(false) }),
    outputSchema: z.array(z.object({ name: z.string(), stock: z.number(), threshold: z.number() })),
  },
  async ({ onlyLowStock }) => {
    const db = getAdminDb();
    const snap = await db.collection('inventory').get();
    
    let items = snap.docs.map(doc => {
        const data = doc.data();
        return { 
          name: data.name, 
          stock: data.quantity || 0, 
          threshold: data.lowStockThreshold || 0 
        };
    });

    if (onlyLowStock) {
        items = items.filter(it => it.stock <= it.threshold);
    }

    return items.sort((a, b) => a.stock - b.stock).slice(0, 15);
  }
);

// --- Definición del Flow ---

const workshopChatFlow = ai.defineFlow(
  {
    name: 'workshopChatFlow',
    inputSchema: WorkshopChatInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const response = await ai.generate({
      system: `Eres el Asistente Inteligente de Ranoro, el experto administrativo del taller.
      Tienes acceso a los datos reales mediante herramientas. 
      Tu misión es ayudar al dueño del taller a entender su negocio.
      Si te piden estadísticas de un mes específico, usa la herramienta getServiceReport.
      Si te preguntan cómo van las finanzas, usa getFinancialStats.
      Si te preguntan qué falta comprar, usa getInventoryStatus.
      Responde siempre de forma amable, profesional y en español.`,
      messages: [
        ...(input.history?.map(m => ({ 
          role: m.role as any, 
          content: [{ text: m.content }] 
        })) || []),
        { role: 'user', content: [{ text: input.message }] }
      ],
      tools: [getServiceReport, getFinancialStats, getInventoryStatus],
    });

    return response.text;
  }
);

/**
 * Función wrapper para interactuar con el asistente de chat.
 */
export async function sendChatMessage(message: string, history: any[] = []): Promise<WorkshopChatOutput> {
    return await workshopChatFlow({ message, history });
}
