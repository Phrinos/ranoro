import { getAdminDb } from '@/lib/firebaseAdmin';

export async function executeTool(
  toolName: string,
  args: any,
  config: any,
  phone: string,
  clientInfo: any,
  isStaff = false,
) {
  const adminDb = getAdminDb();

  switch (toolName) {
    case 'search_customer_by_phone': {
      try {
        const queryPhone = (args.phone || phone).replace(/\D/g, '');
        const snapshot = await adminDb.collection('users').where('phone', '==', queryPhone).limit(1).get();
        if (snapshot.empty) return { message: 'No se encontró un cliente con este número de teléfono.' };
        return { customer: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } };
      } catch (error: any) {
        return { error: `Error searching customer: ${error.message}` };
      }
    }

    case 'get_vehicle_status': {
      try {
        const queryPhone = (args.phone || phone).replace(/\D/g, '');
        // We will query serviceRecords directly. In Ranoro, they have 'ownerPhone' or 'customerPhone'.
        const snapshot = await adminDb.collection('serviceRecords')
          .where('ownerPhone', '==', queryPhone)
          .where('status', 'in', ['pending', 'in_progress', 'ready'])
          .orderBy('createdAt', 'desc')
          .limit(3)
          .get();

        if (snapshot.empty) {
          return { message: 'No tienes ningún vehículo en servicio activo en este momento.' };
        }

        const services = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            vehicle: d.vehicleInfo || d.licensePlate || 'Vehículo',
            status: d.status,
            serviceType: d.serviceTypeLabel || 'Servicio',
            total: d.totalAmount || 0,
            date: d.createdAt?.toDate ? d.createdAt.toDate() : d.createdAt
          };
        });

        return { services };
      } catch (error: any) {
        return { error: `Error obteniendo estado del vehículo: ${error.message}` };
      }
    }

    case 'get_prices': {
      try {
        // Query the listadeprecios collection or an aggregated cache
        const limit = args.limit || 5;
        const snapshot = await adminDb.collection('globalCatalog').limit(limit).get();
        // Since pricing in Ranoro is complex (vehicles -> recipes -> supplies), we return a general response
        // if specific query is not available, or we just tell the AI to advise the client to get a direct quote.
        return { message: 'Para darte un precio exacto, necesitamos generar una cotización formal basada en el modelo exacto de tu auto. Los precios de mano de obra base rondan los $500 - $1500 MXN dependiendo del servicio.' };
      } catch (error: any) {
        return { error: `Error fetching prices: ${error.message}` };
      }
    }

    case 'create_appointment': {
      try {
        const appointmentData = {
          clientName: args.clientName || clientInfo?.name || 'Cliente WhatsApp',
          clientPhone: args.clientPhone || phone,
          vehicleInfo: args.vehicleInfo || 'No especificado',
          serviceType: args.serviceType || 'Revisión General',
          date: args.date,
          timeSlot: args.timeSlot || '08:30',
          slotIndex: 0,
          status: 'scheduled',
          notes: args.notes || '',
          createdAt: new Date(),
          source: 'whatsapp',
        };
        const docRef = await adminDb.collection('workshopAppointments').add(appointmentData);
        return { success: true, appointmentId: docRef.id, details: appointmentData };
      } catch (error: any) {
        return { error: `Error creating appointment: ${error.message}` };
      }
    }

    default:
      return { message: `Unknown tool: ${toolName}` };
  }
}
