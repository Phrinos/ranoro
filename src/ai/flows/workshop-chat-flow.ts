'use server';
/**
 * @fileOverview Flow de Chat Inteligente para el Taller.
 * Permite a los usuarios hacer preguntas sobre los datos de la plataforma.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAdminDb } from '@/lib/firebaseAdmin';

// --- Herramientas para la IA ---

/**
 * Obtiene estadísticas de los vehículos que han pasado por el taller.
 */
const getVehicleStats = ai.defineTool(
  {
    name: 'getVehicleStats',
    description: 'Obtiene una lista de los vehículos (marcas y modelos) más comunes atendidos en el taller.',
    inputSchema: z.object({ limit: z.number().optional().default(10) }),
    outputSchema: z.array(z.object({ vehicle: z.string(), count: z.number() })),
  },
  async ({ limit }) => {
    const db = getAdminDb();
    const servicesSnap = await db.collection('serviceRecords').get();
    const counts: Record<string, number> = {};

    servicesSnap.forEach(doc => {
      const data = doc.data();
      const identifier = data.vehicleIdentifier || 'Desconocido';
      // Limpiamos el identificador para agrupar mejor (quitamos placas si es posible)
      const cleanName = identifier.split(' ').slice(0, 2).join(' '); 
      counts[cleanName] = (counts[cleanName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([vehicle, count]) => ({ vehicle, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
);

/**
 * Obtiene los tipos de servicio más frecuentes.
 */
const getServiceStats = ai.defineTool(
  {
    name: 'getServiceStats',
    description: 'Obtiene los tipos de trabajo o afinaciones más comunes realizados en el taller.',
    inputSchema: z.object({ limit: z.number().optional().default(10) }),
    outputSchema: z.array(z.object({ serviceName: z.string(), count: z.number() })),
  },
  async ({ limit }) => {
    const db = getAdminDb();
    const servicesSnap = await db.collection('serviceRecords').get();
    const counts: Record<string, number> = {};

    servicesSnap.forEach(doc => {
      const data = doc.data();
      if (Array.isArray(data.serviceItems)) {
        data.serviceItems.forEach((item: any) => {
          const name = item.name || item.itemName || 'Otro';
          counts[name] = (counts[name] || 0) + 1;
        });
      }
    });

    return Object.entries(counts)
      .map(([serviceName, count]) => ({ serviceName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
);

/**
 * Obtiene un resumen del inventario actual.
 */
const getInventorySummary = ai.defineTool(
  {
    name: 'getInventorySummary',
    description: 'Obtiene un resumen de los productos con poco stock o los más valiosos.',
    inputSchema: z.object({ filter: z.enum(['low_stock', 'all']).optional().default('all') }),
    outputSchema: z.array(z.object({ name: z.string(), quantity: z.number(), sku: z.string().optional() })),
  },
  async ({ filter }) => {
    const db = getAdminDb();
    let q = db.collection('inventory').where('isService', '==', false);
    const snap = await q.get();
    
    let items = snap.docs.map(doc => {
        const data = doc.data();
        return { name: data.name, quantity: data.quantity || 0, sku: data.sku, lowStockThreshold: data.lowStockThreshold || 0 };
    });

    if (filter === 'low_stock') {
        items = items.filter(it => it.quantity <= it.lowStockThreshold);
    }

    return items.sort((a, b) => a.quantity - b.quantity).slice(0, 20);
  }
);

// --- Definición del Flow ---

const MessageSchema = z.object({
    role: z.enum(['user', 'model', 'system']),
    content: z.string(),
});

export const workshopChatFlow = ai.defineFlow(
  {
    name: 'workshopChatFlow',
    inputSchema: z.object({
      history: z.array(MessageSchema).optional(),
      message: z.string(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    // Usamos ai.chat para manejar el historial de forma correcta en Genkit 1.x
    const chat = ai.chat({
      system: `Eres el Asistente Inteligente de Ranoro, un experto en gestión de talleres mecánicos. 
      Tienes acceso a los datos reales del taller mediante herramientas. 
      Tu objetivo es responder preguntas sobre el negocio, como estadísticas de vehículos, servicios más comunes o estado del inventario.
      Responde siempre de forma amable, profesional y en español. 
      Si no tienes una herramienta para responder algo específico, indícalo cortésmente.`,
      history: input.history?.map(m => ({ 
        role: m.role as any, 
        content: [{ text: m.content }] 
      })),
    });

    const response = await chat.send({
      text: input.message,
      tools: [getVehicleStats, getServiceStats, getInventorySummary],
    });

    return response.text;
  }
);

/**
 * Función exportada para ser llamada desde el cliente.
 */
export async function sendChatMessage(message: string, history: any[] = []) {
    return await workshopChatFlow({ message, history });
}
