
// diagnose-assignments.js
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
    // Lógica de normalización robusta
    return name.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function diagnoseAssignments() {
  console.log('Iniciando script de DIAGNÓSTICO de asignaciones...');

  try {
    // 1. Obtener y mostrar los perfiles de usuario existentes.
    const usersSnapshot = await db.collection('users').get();
    const allUsers = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      normalizedName: normalizeName(doc.data().name)
    }));
    console.log(`\n--- Perfiles de Usuario Encontrados (${allUsers.length}) ---`);
    allUsers.forEach(u => console.log(`  - ID: ${u.id.slice(0,10)}... | Nombre: "${u.name}" | Normalizado: "${u.normalizedName}"`));

    // 2. Obtener todos los registros de servicio.
    const servicesSnapshot = await db.collection('serviceRecords').get();
    console.log(`\n--- Analizando ${servicesSnapshot.size} Registros de Servicio ---`);
    
    let itemsWithoutIdCount = 0;
    let potentialMatchesCount = 0;

    servicesSnapshot.forEach(doc => {
      const service = doc.data();
      const serviceId = doc.id;

      if (service.serviceItems && Array.isArray(service.serviceItems)) {
        service.serviceItems.forEach((item, index) => {
          // Nos interesan solo los items que tienen un nombre de técnico pero NO un ID.
          if (item.technicianName && !item.technicianId) {
            itemsWithoutIdCount++;
            const normalizedItemName = normalizeName(item.technicianName);
            
            console.log(`\n[!] Item necesita vinculación en Servicio ID: ${serviceId}`);
            console.log(`    - Nombre guardado: "${item.technicianName}" (Normalizado: "${normalizedItemName}")`);

            // Lógica de búsqueda bidireccional y más flexible.
            const matchingUsers = allUsers.filter(user =>
              user.normalizedName.includes(normalizedItemName) ||
              normalizedItemName.includes(user.normalizedName)
            );

            if (matchingUsers.length === 1) {
              const foundUser = matchingUsers[0];
              console.log(`    ✅ [DIAGNÓSTICO]: COINCIDENCIA ÚNICA encontrada -> Se vincularía con "${foundUser.name}"`);
              potentialMatchesCount++;
            } else if (matchingUsers.length > 1) {
              console.log(`    ⚠️ [DIAGNÓSTICO]: COINCIDENCIA AMBIGUA encontrada. Se omitiría.`);
            } else {
              console.log(`    ❌ [DIAGNÓSTICO]: SIN COINCIDENCIA.`);
            }
          }
        });
      }
    });

    console.log('\n\n--- Reporte del Diagnóstico Finalizado ---');
    if (itemsWithoutIdCount === 0) {
        console.log('✅ Parece que no hay items que necesiten ser vinculados. Todos los registros ya tienen un ID de técnico.');
    } else {
        console.log(`Se encontraron ${itemsWithoutIdCount} asignaciones de trabajo sin un ID de técnico vinculado.`);
        console.log(`La lógica de corrección V3 podría vincular exitosamente ${potentialMatchesCount} de estas asignaciones.`);
        if (potentialMatchesCount > 0) {
            console.log('\nCONCLUSIÓN: El problema ha sido identificado. El siguiente paso sería ejecutar un script de corrección con esta nueva lógica.');
        } else {
            console.log('\nCONCLUSIÓN: No se encontraron coincidencias claras. Por favor, revisa los nombres guardados en los servicios y compáralos con los nombres en los perfiles de usuario para encontrar la discrepancia.');
        }
    }

  } catch (error) {
    console.error('Ocurrió un error durante el diagnóstico:', error);
  }
}

diagnoseAssignments().then(() => {
    console.log('\nScript finalizado.');
    process.exit(0);
}).catch(() => process.exit(1));
