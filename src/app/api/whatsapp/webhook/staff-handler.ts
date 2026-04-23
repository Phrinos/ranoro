import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function handleStaffMessage(params: any) {
  const { staffPhone, message, config, adminDb, executeTool, formatNow } = params;

  try {
    const { today, currentTime } = formatNow();
    const systemInstruction = `Eres SofIA en "Modo Administrador".
Estás hablando directamente con un mecánico o administrador del taller Ranoro (teléfono ${staffPhone}).
Responde a las órdenes de manera directa, concisa y sin preámbulos.
Tienes acceso a todas las herramientas.
Si el administrador te pide información de un auto, usa 'get_vehicle_status'.
Si pide agendar cita, usa 'create_appointment'.

Fecha actual: ${today}, ${currentTime}`;

    const tools = [
      {
        name: 'search_customer_by_phone',
        description: 'Busca a un cliente por número de teléfono en la BD.',
        parameters: { type: 'object', properties: { phone: { type: 'string' } }, required: ['phone'] }
      },
      {
        name: 'get_vehicle_status',
        description: 'Consulta el estatus actual del auto del cliente en el taller.',
        parameters: { type: 'object', properties: { phone: { type: 'string' } }, required: ['phone'] }
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

    const chat = model.startChat({ history: [] });
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    const functionCalls = result.response.functionCalls();
    let finalReply = responseText;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const toolRes = await executeTool(call.name, call.args, config, staffPhone, null, true);
      const secondResult = await chat.sendMessage([{ functionResponse: { name: call.name, response: toolRes } }]);
      finalReply = secondResult.response.text();
    }

    if (finalReply) {
      console.log(`[Staff SofIA -> ${staffPhone}]: ${finalReply}`);
      return NextResponse.json({ reply: finalReply });
    }

    return NextResponse.json({ reply: null });
  } catch (error: any) {
    console.error('[SofIA] Staff Handler Error:', error);
    return NextResponse.json({ reply: '❌ Error al procesar comando administrativo.' });
  }
}
