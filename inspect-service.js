
// inspect-service.js
const admin = require('firebase-admin');

// --- Configuración ---
// Asegúrate de que 'serviceAccountKey.json' esté en la carpeta /functions.
try {
  const serviceAccount = require('./functions/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('ERROR: Archivo de credenciales no encontrado en /functions.');
  process.exit(1);
}

const db = admin.firestore();
const FOLIO_TO_INSPECT = '250918-0006';

async function inspectService(folio) {
  console.log(`--- Iniciando inspección para el servicio con Folio: ${folio} ---`);

  // 1. Encontrar el servicio por su folio
  const serviceQuery = db.collection('serviceRecords').where('folio', '==', folio);
  const serviceSnapshot = await serviceQuery.get();

  if (serviceSnapshot.empty) {
    console.error(`\n[ERROR] No se encontró ningún servicio con el folio "${folio}".`);
    return;
  }

  const serviceDoc = serviceSnapshot.docs[0];
  const service = serviceDoc.data();
  console.log(`\nServicio Encontrado (ID: ${serviceDoc.id})`);
  console.log(`  - Estado: ${service.status}`);
  console.log(`  - Fecha de Entrega: ${service.deliveryDateTime}`);
  console.log(`  - Comisión Total Guardada: ${service.totalCommission === undefined ? 'No definida' : service.totalCommission}`);


  if (!service.serviceItems || service.serviceItems.length === 0) {
    console.log("  - Este servicio no tiene items (trabajos o refacciones) registrados.");
    return;
  }

  console.log("\n--- Analizando Items del Servicio ---");

  // 2. Analizar cada item y su técnico asignado
  for (const item of service.serviceItems) {
    console.log(`\n  --------------------------------`);
    console.log(`  Item: "${item.name}"`);
    console.log(`  Precio de Venta: ${item.sellingPrice}`);
    console.log(`  Comisión Guardada en Item: ${item.technicianCommission === undefined ? 'No definida' : item.technicianCommission}`);
    
    if (!item.technicianId) {
      console.log("  [INFO] Este item no tiene un técnico asignado.");
      continue;
    }

    console.log(`  ID del Técnico Asignado: "${item.technicianId}"`);

    // 3. Buscar el perfil del técnico
    const userRef = db.collection('users').doc(item.technicianId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error(`  [ERROR CRÍTICO] ¡El perfil para el técnico con ID "${item.technicianId}" no existe!`);
    } else {
      const user = userDoc.data();
      console.log("\n  --- Perfil del Técnico Encontrado ---");
      console.log(`  Nombre en Perfil: "${user.name}"`);
      console.log(`  Rol en Perfil: ${user.role}`);
      console.log(`  Porcentaje de Comisión: ${user.commissionRate === undefined ? 'No definido' : user.commissionRate}`);

      // 4. Simular la lógica de cálculo
      if (user.commissionRate && typeof user.commissionRate === 'number' && user.commissionRate > 0) {
        const calculatedCommission = (item.sellingPrice || 0) * (user.commissionRate / 100);
        console.log(`  ✅ [SIMULACIÓN] La comisión para este item debería ser: $${calculatedCommission.toFixed(2)}`);
      } else {
        console.warn(`  ⚠️ [SIMULACIÓN] La comisión es CERO porque el campo 'commissionRate' en el perfil del usuario no es un número mayor a 0.`);
      }
    }
  }
}

inspectService(FOLIO_TO_INSPECT)
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
