import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FieldValue } from 'firebase-admin/firestore';
import { getSystemPrompt } from './system-prompt';

// Debounce map: stores ongoing message aggregations per conversation
const pendingMessages = new Map<string, {
  timer: NodeJS.Timeout;
  resolve: (res: any) => void;
  parts: string[];
}>();
const DEBOUNCE_MS = 2500;

export async function handleClientMessage(params: any) {
  const { phone, conversationId, message, pushName, config, adminDb, executeTool, requestUrl } = params;

  // Save raw message immediately
  const convRef = adminDb.collection('whatsapp-conversations').doc(conversationId);
  await convRef.collection('messages').add({ role: 'user', content: message, timestamp: FieldValue.serverTimestamp() });
  await convRef.set({
    pushName: pushName || 'Cliente',
    lastMessageAt: FieldValue.serverTimestamp(),
    totalMessages: FieldValue.increment(1),
    phone: phone
  }, { merge: true });

  // Read-before-respond logic
  return new Promise<NextResponse>((resolve) => {
    if (pendingMessages.has(conversationId)) {
      const pending = pendingMessages.get(conversationId)!;
      clearTimeout(pending.timer);
      pending.parts.push(message);
      pending.timer = setTimeout(() => processAggregatedMessage(conversationId, params, pending.parts, pending.resolve), DEBOUNCE_MS);
      resolve(NextResponse.json({ reply: null, status: 'debounced' }));
    } else {
      const parts = [message];
      const timer = setTimeout(() => processAggregatedMessage(conversationId, params, parts, resolve), DEBOUNCE_MS);
      pendingMessages.set(conversationId, { timer, resolve, parts });
    }
  });
}

async function processAggregatedMessage(conversationId: string, params: any, parts: string[], resolve: (res: any) => void) {
  pendingMessages.delete(conversationId);
  const fullMessage = parts.join('\\n');
  const { phone, pushName, config, adminDb, executeTool, formatNow } = params;

  try {
    const docSnap = await adminDb.collection('whatsapp-conversations').doc(conversationId).get();
    if (docSnap.exists && docSnap.data()?.humanTakeover) {
      console.log(`[SofIA] 🛑 Modo silencioso (Staff activo) para ${conversationId}. Ignorando AI.`);
      return resolve(NextResponse.json({ reply: null, status: 'ignored_takeover' }));
    }

    const { today, currentTime } = formatNow();
    const systemInstruction = getSystemPrompt(config) + `\n\nContexto actual: Hoy es ${today}, la hora actual es ${currentTime}.`;

    // Tool declarations
    const tools = [
      {
        name: 'search_customer_by_phone',
        description: 'Busca a un cliente por número de teléfono en la BD.',
        parameters: { type: 'object', properties: { phone: { type: 'string', description: 'Número de WhatsApp de 10 dígitos' } }, required: ['phone'] }
      },
      {
        name: 'get_vehicle_status',
        description: 'Consulta el estatus actual del auto del cliente en el taller.',
        parameters: { type: 'object', properties: { phone: { type: 'string', description: 'Número a consultar' } }, required: ['phone'] }
      },
      {
        name: 'get_prices',
        description: 'Consulta los precios aproximados.',
        parameters: { type: 'object', properties: { limit: { type: 'number' } } }
      },
      {
        name: 'create_appointment',
        description: 'Agenda una cita mecánica en el sistema.',
        parameters: { type: 'object', properties: { date: { type: 'string' }, timeSlot: { type: 'string' }, vehicleInfo: { type: 'string' } }, required: ['date', 'timeSlot', 'vehicleInfo'] }
      }
    ];

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: config.geminiModel || 'gemini-2.5-flash',
      systemInstruction,
      tools: [{ functionDeclarations: tools }] as any
    });

    // History (Simplified)
    const history = [
      { role: 'user', parts: [{ text: fullMessage }] }
    ];

    const chat = model.startChat({ history: [] }); // We just pass message directly for simplicity, real app handles history
    const result = await chat.sendMessage(fullMessage);
    const responseText = result.response.text();

    const functionCalls = result.response.functionCalls();
    let finalReply = responseText;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const toolRes = await executeTool(call.name, call.args, config, phone, null, false);
      const secondResult = await chat.sendMessage([{ functionResponse: { name: call.name, response: toolRes } }]);
      finalReply = secondResult.response.text();
    }

    if (finalReply) {
      await adminDb.collection('whatsapp-conversations').doc(conversationId).collection('messages').add({
        role: 'assistant', content: finalReply, timestamp: FieldValue.serverTimestamp()
      });
      console.log(`[SofIA -> ${conversationId}]: ${finalReply.substring(0, 100)}...`);
      resolve(NextResponse.json({ reply: finalReply }));
    } else {
      resolve(NextResponse.json({ reply: null }));
    }

  } catch (error: any) {
    console.error('[SofIA] Client Handler Error:', error);
    resolve(NextResponse.json({ reply: 'Ocurrió un problema de conexión. Permíteme un momento por favor.' }));
  }
}
