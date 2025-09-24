
// backfill-public-services.js
const admin = require('firebase-admin');
const { nanoid } = require('nanoid');

// --- Autenticación ---
const serviceAccount = require('/home/user/studio/firebase-admin-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const getPublicData = (service) => {
    const publicData = {
      folio: service.folio,
      status: service.status,
      publicId: service.publicId,
    };

    // Solo incluir campos si no son undefined
    if (service.vehicle !== undefined) {
        publicData.vehicle = service.vehicle;
    }
    if (service.customer !== undefined) {
        publicData.customer = service.customer;
    }
    if (service.items !== undefined) {
        publicData.items = service.items;
    }
    if (service.reception !== undefined) {
        publicData.reception = service.reception;
    }

    return publicData;
};

async function backfillPublicServices() {
  console.log("Iniciando backfill para publicServices...");

  const servicesRef = db.collection('serviceRecords');
  const snapshot = await servicesRef.get();

  if (snapshot.empty) {
    console.log("No se encontraron servicios.");
    return;
  }

  let batch = db.batch();
  let updatedCount = 0;
  let operations = 0;

  for (const doc of snapshot.docs) {
    const serviceData = doc.data();
    let needsUpdate = false;

    if (!serviceData.publicId) {
      serviceData.publicId = nanoid(16);
      batch.update(doc.ref, { publicId: serviceData.publicId });
      needsUpdate = true;
    }

    const publicDocRef = db.collection('publicServices').doc(serviceData.publicId);
    const publicData = getPublicData(serviceData);
    
    batch.set(publicDocRef, publicData, { merge: true });
    
    operations += (needsUpdate ? 2 : 1);
    updatedCount++;

    if (operations >= 490) {
      console.log(`Ejecutando lote de ${operations} operaciones...`);
      await batch.commit();
      batch = db.batch();
      operations = 0;
    }
  }

  if (operations > 0) {
    console.log(`Ejecutando lote final de ${operations} operaciones...`);
    await batch.commit();
  }

  console.log('-------------------------------------------');
  console.log("Backfill completado.");
  console.log(`Servicios revisados y sincronizados: ${updatedCount}`);
  console.log('-------------------------------------------');
}

backfillPublicServices().catch(console.error);
