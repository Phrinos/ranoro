
const admin = require('firebase-admin');

// --- Instrucciones de Autenticación ---
// 1. Descarga tu clave de cuenta de servicio JSON desde Firebase Console:
//    Proyecto > Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada.
// 2. Guarda el archivo en un lugar seguro FUERA de tu repositorio de código.
// 3. Descomenta una de las siguientes opciones para autenticarte:

// Opción A: Usando una variable de entorno (Recomendado para producción/servidores)
// En tu terminal, ejecuta:
// export GOOGLE_APPLICATION_CREDENTIALS="/ruta/a/tu/archivo-de-credenciales.json"
// Luego, el script funcionará sin cambios.

// Opción B: Referencia directa al archivo (Útil para ejecución local)
// Comenta la linea de abajo y pon la ruta correcta a tu archivo.
// const serviceAccount = require('/ruta/absoluta/a/tu/archivo-de-credenciales.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// Si el entorno ya está configurado (como en Google Cloud Shell), esta línea es suficiente.
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
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
