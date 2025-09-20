
const admin = require('firebase-admin');

// --- Instrucciones de Autenticación ---
// Se ha configurado el script para usar la clave de servicio local.

const serviceAccount = require('/home/user/studio/firebase-admin-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const db = admin.firestore();

async function backfillDriverData() {
  console.log("Iniciando proceso para actualizar conductores...");

  const driversRef = db.collection('drivers');
  const snapshot = await driversRef.get();

  if (snapshot.empty) {
    console.log("No se encontraron conductores. Saliendo.");
    return;
  }

  console.log(`Se encontraron ${snapshot.size} conductores. Verificando el campo 'isArchived'...`);

  let batch = db.batch();
  let updatedCount = 0;
  let operationsInBatch = 0;

  for (const doc of snapshot.docs) {
    const driverData = doc.data();

    // Revisa si el campo 'isArchived' NO existe en el documento
    if (driverData.isArchived === undefined) {
      console.log(`Actualizando conductor ${doc.id}... se añadirá isArchived: false`);
      batch.update(doc.ref, { isArchived: false });
      updatedCount++;
      operationsInBatch++;

      // Los lotes de Firestore tienen un límite de 500 operaciones.
      // Si llegamos al límite, ejecutamos el lote y creamos uno nuevo.
      if (operationsInBatch === 499) {
        console.log("Ejecutando lote de 500 actualizaciones...");
        await batch.commit();
        batch = db.batch();
        operationsInBatch = 0;
      }
    }
  }

  // Ejecuta las actualizaciones restantes en el último lote
  if (operationsInBatch > 0) {
    console.log(`Ejecutando el lote final de ${operationsInBatch} actualizaciones...`);
    await batch.commit();
  }

  console.log('-------------------------------------------');
  console.log("Proceso completado.");
  console.log(`Conductores revisados: ${snapshot.size}`);
  console.log(`Conductores actualizados: ${updatedCount}`);
  console.log('-------------------------------------------');
}

backfillDriverData().catch(error => {
  console.error("Ocurrió un error durante el proceso:", error);
});
