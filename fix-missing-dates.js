
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-admin-key.json'); // Asegúrate de que esta ruta es correcta

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixMissingDeliveryDates() {
  console.log('Buscando servicios entregados sin fecha de entrega...');

  const servicesRef = db.collection('serviceRecords');
  const snapshot = await servicesRef
    .where('status', '==', 'Entregado')
    .where('deliveryDateTime', '==', null)
    .get();

  if (snapshot.empty) {
    console.log('No se encontraron servicios para corregir. ¡Todo en orden!');
    return;
  }

  console.log(`Se encontraron ${snapshot.docs.length} servicios para corregir.`);

  const batch = db.batch();
  let count = 0;

  snapshot.docs.forEach(doc => {
    const service = doc.data();
    
    // Lógica de fallback para encontrar la mejor fecha posible
    const fallbackDate = 
      service.serviceDate || 
      service.updatedAt || 
      service.createdAt || 
      admin.firestore.Timestamp.now(); // Como último recurso, la fecha actual

    const dateToUse = fallbackDate.toDate ? fallbackDate.toDate() : new Date(fallbackDate);

    console.log(`Corrigiendo servicio ${doc.id}. Usando fecha: ${dateToUse.toISOString()}`);
    
    batch.update(doc.ref, { deliveryDateTime: dateToUse.toISOString() });
    count++;
  });

  try {
    await batch.commit();
    console.log(`¡Éxito! Se corrigieron ${count} servicios.`);
  } catch (error) {
    console.error('Error al intentar corregir los servicios:', error);
  }
}

fixMissingDeliveryDates().catch(console.error);
