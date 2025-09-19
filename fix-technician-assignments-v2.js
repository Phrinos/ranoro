
// fix-technician-assignments-v2.js
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

const normalizeName = (name) => {
    if (!name || typeof name !== 'string') return '';
    return name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function fixTechnicianAssignmentsV2() {
  console.log('Iniciando script v2 para vincular técnicos...');

  try {
    // 1. Obtener todos los usuarios y almacenarlos con su nombre normalizado.
    const usersSnapshot = await db.collection('users').get();
    const allUsers = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      normalizedName: normalizeName(doc.data().name)
    }));
    console.log(`${allUsers.length} perfiles de usuario cargados.`);
    
    // 2. Obtener todos los registros de servicio.
    const servicesSnapshot = await db.collection('serviceRecords').get();
    console.log(`Analizando ${servicesSnapshot.size} registros de servicio...`);

    const batch = db.batch();
    let itemsUpdatedCount = 0;
    let servicesToUpdateCount = 0;
    const ambiguousMatches = new Set();
    const noMatchesFound = new Set();

    servicesSnapshot.forEach(doc => {
      const service = doc.data();
      const serviceId = doc.id;
      let serviceNeedsUpdate = false;
      
      if (service.serviceItems && Array.isArray(service.serviceItems)) {
        const updatedServiceItems = service.serviceItems.map(item => {
          // Condición: tiene nombre de técnico pero no ID.
          if (item.technicianName && !item.technicianId) {
            const normalizedTechnicianNameFromItem = normalizeName(item.technicianName);
            
            // Lógica de búsqueda flexible
            const matchingUsers = allUsers.filter(user => 
              user.normalizedName.includes(normalizedTechnicianNameFromItem)
            );

            if (matchingUsers.length === 1) {
              // Coincidencia única y clara. ¡Perfecto!
              const foundUser = matchingUsers[0];
              console.log(`  [ÉXITO] Vinculando "${item.technicianName}" del servicio ${serviceId.slice(0,6)}... al perfil de "${foundUser.name}".`);
              serviceNeedsUpdate = true;
              itemsUpdatedCount++;
              return { ...item, technicianId: foundUser.id };
            } else if (matchingUsers.length > 1) {
              // Coincidencia ambigua.
              console.warn(`  [AVISO] Coincidencia ambigua para "${item.technicianName}" en servicio ${serviceId.slice(0,6)}... Se omite la vinculación.`);
              ambiguousMatches.add(item.technicianName);
            } else {
              // No se encontró coincidencia.
              noMatchesFound.add(item.technicianName);
            }
          }
          return item;
        });

        if (serviceNeedsUpdate) {
          const serviceRef = db.collection('serviceRecords').doc(serviceId);
          batch.update(serviceRef, { serviceItems: updatedServiceItems });
          servicesToUpdateCount++;
        }
      }
    });

    if (itemsUpdatedCount > 0) {
      console.log(`\nSe encontraron ${itemsUpdatedCount} vinculaciones claras en ${servicesToUpdateCount} servicios. Aplicando cambios...`);
      await batch.commit();
      console.log('¡Base de datos actualizada exitosamente!');
    } else {
      console.log('\nNo se encontraron vinculaciones claras para realizar.');
    }

    console.log('\n--- Reporte de Vinculación Finalizado ---');
    console.log(`✅ Se vincularon exitosamente ${itemsUpdatedCount} asignaciones.`);
    if (ambiguousMatches.size > 0) {
      console.warn(`\n🚨 ${ambiguousMatches.size} nombres tuvieron coincidencias ambiguas y no fueron vinculados:`);
      ambiguousMatches.forEach(name => console.log(`  - ${name}`));
    }
    if (noMatchesFound.size > 0) {
      console.log(`\nℹ️ ${noMatchesFound.size} nombres no encontraron ninguna coincidencia en los perfiles de usuario:`);
      noMatchesFound.forEach(name => console.log(`  - ${name}`));
    }

  } catch (error) {
    console.error('Ocurrió un error durante la vinculación:', error);
  }
}

fixTechnicianAssignmentsV2().then(() => {
    console.log('\nScript finalizado.');
    process.exit(0);
}).catch(() => process.exit(1));
