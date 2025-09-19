
// fix-technician-assignments.js
const admin = require('firebase-admin');

// --- Configuración ---
// Este script requiere el mismo archivo de credenciales que el anterior.
// Asegúrate de que 'serviceAccountKey.json' esté en la carpeta /functions.
try {
  const serviceAccount = require('./functions/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('*********************************************************************');
  console.error('ERROR: Archivo de credenciales no encontrado.');
  console.error('Por favor, asegúrate de que "serviceAccountKey.json" exista');
  console.error('en la carpeta /functions para que el script pueda ejecutarse.');
  console.error('*********************************************************************');
  process.exit(1);
}

const db = admin.firestore();

// Helper para normalizar nombres (quitar espacios extra, mayúsculas, etc.)
const normalizeName = (name) => {
    if (!name || typeof name !== 'string') return '';
    return name.trim().toLowerCase();
}

async function fixTechnicianAssignments() {
  console.log('Iniciando script para vincular técnicos a trabajos antiguos...');

  try {
    // 1. Obtener todos los usuarios y crear un mapa de nombre -> ID.
    const usersSnapshot = await db.collection('users').get();
    const userNameToIdMap = new Map();
    usersSnapshot.forEach(doc => {
        const user = doc.data();
        if (user.name) {
            userNameToIdMap.set(normalizeName(user.name), doc.id);
        }
    });
    console.log(`Mapa de usuarios creado. ${userNameToIdMap.size} usuarios encontrados.`);
    
    // 2. Obtener todos los registros de servicio.
    const servicesSnapshot = await db.collection('serviceRecords').get();
    console.log(`Analizando ${servicesSnapshot.size} registros de servicio...`);

    // 3. Preparar un batch de escritura para hacer todas las actualizaciones a la vez.
    const batch = db.batch();
    let itemsUpdatedCount = 0;
    let servicesToUpdate = 0;

    servicesSnapshot.forEach(doc => {
      const service = doc.data();
      const serviceId = doc.id;
      let serviceNeedsUpdate = false;
      
      // Asegurarse de que serviceItems exista y sea un array
      if (service.serviceItems && Array.isArray(service.serviceItems)) {
        const updatedServiceItems = service.serviceItems.map(item => {
          // La condición clave: tiene nombre de técnico pero no tiene ID.
          if (item.technicianName && !item.technicianId) {
            const normalizedTechnicianName = normalizeName(item.technicianName);
            const foundUserId = userNameToIdMap.get(normalizedTechnicianName);

            // Si encontramos un ID de usuario que coincida con el nombre...
            if (foundUserId) {
              console.log(`  -> Coincidencia encontrada en servicio ${serviceId.slice(0, 6)}...: "${item.technicianName}" será vinculado al ID ${foundUserId.slice(0, 6)}...`);
              serviceNeedsUpdate = true;
              itemsUpdatedCount++;
              // ...devolvemos el item con el ID añadido.
              return { ...item, technicianId: foundUserId };
            }
          }
          // Si no hay nada que cambiar, devolvemos el item tal como está.
          return item;
        });

        // Si hemos modificado algún item en este servicio, preparamos la actualización en el batch.
        if (serviceNeedsUpdate) {
          const serviceRef = db.collection('serviceRecords').doc(serviceId);
          batch.update(serviceRef, { serviceItems: updatedServiceItems });
          servicesToUpdate++;
        }
      }
    });

    // 4. Ejecutar el batch si encontramos algo que actualizar.
    if (itemsUpdatedCount > 0) {
      console.log(`\nSe encontraron ${itemsUpdatedCount} items en ${servicesToUpdate} servicios para actualizar. Ejecutando escritura en la base de datos...`);
      await batch.commit();
      console.log('¡Base de datos actualizada exitosamente!');
    } else {
      console.log('No se encontraron items que necesiten ser actualizados.');
    }

    // 5. Reporte final.
    console.log('\n--- Vinculación Finalizada ---');
    if (itemsUpdatedCount > 0) {
        console.log(`✅ Proceso completado. Se actualizaron ${itemsUpdatedCount} asignaciones de técnicos.`);
        console.log('El reporte de rendimiento ahora debería mostrar los datos históricos correctamente.');
    } else {
        console.log('✅ No fue necesario realizar ninguna vinculación. Todos los datos ya estaban correctos.');
    }

  } catch (error) {
    console.error('Ocurrió un error durante la vinculación:', error);
  }
}

fixTechnicianAssignments().then(() => {
    console.log('\nScript finalizado.');
    process.exit(0);
}).catch(() => process.exit(1));
