
// find-missing-technicians.js
const admin = require('firebase-admin');

// --- Configuración ---
// Para que este script funcione, necesitas tu archivo de credenciales de Firebase.
// 1. Ve a tu proyecto en Firebase Console -> Configuración del proyecto -> Cuentas de servicio.
// 2. Haz clic en "Generar nueva clave privada" y descarga el archivo JSON.
// 3. Renombra ese archivo a "serviceAccountKey.json" y colócalo en la carpeta "functions".
try {
  const serviceAccount = require('./functions/serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('*********************************************************************');
  console.error('ERROR: Archivo de credenciales no encontrado.');
  console.error('Por favor, descarga tu "serviceAccountKey.json" de la consola de Firebase');
  console.error('y colócalo en la carpeta /functions para que el script pueda ejecutarse.');
  console.error('*********************************************************************');
  process.exit(1);
}

const db = admin.firestore();

async function findMissingTechnicians() {
  console.log('Iniciando auditoría de técnicos...');

  try {
    // 1. Obtener todos los usuarios existentes y guardar sus IDs para una búsqueda rápida.
    const usersSnapshot = await db.collection('users').get();
    const existingUserIds = new Set(usersSnapshot.docs.map(doc => doc.id));
    console.log(`Encontrados ${existingUserIds.size} perfiles de usuario existentes.`);

    // 2. Obtener todos los registros de servicio.
    const servicesSnapshot = await db.collection('serviceRecords').get();
    console.log(`Analizando ${servicesSnapshot.size} registros de servicio...`);

    // Usamos un Map para guardar los técnicos faltantes y evitar duplicados.
    const missingTechnicians = new Map();

    // 3. Recorrer cada servicio y sus items.
    servicesSnapshot.forEach(doc => {
      const service = doc.data();
      if (service.serviceItems && Array.isArray(service.serviceItems)) {
        service.serviceItems.forEach(item => {
          // Si un item tiene un técnico asignado...
          if (item.technicianId) {
            // ...y ese técnico NO existe en nuestra lista de usuarios...
            if (!existingUserIds.has(item.technicianId)) {
              // ...lo añadimos a nuestra lista de técnicos faltantes.
              missingTechnicians.set(item.technicianId, item.technicianName || 'Nombre no registrado');
            }
          }
        });
      }
    });

    // 4. Reportar los resultados.
    console.log('\n--- Auditoría Finalizada ---');
    if (missingTechnicians.size === 0) {
      console.log('✅ ¡Excelente! Todos los técnicos asignados a trabajos tienen un perfil de usuario.');
    } else {
      console.log(`🚨 Se encontraron ${missingTechnicians.size} técnicos asignados a trabajos que no tienen un perfil de usuario:`);
      missingTechnicians.forEach((name, id) => {
        console.log(`  -> Nombre: ${name} (ID: ${id})`);
      });
      console.log('\nAcción requerida:');
      console.log('Por favor, ve a la sección de "Personal" en la aplicación y crea un perfil para cada uno de estos técnicos, asegurándote de asignarles su rol y porcentaje de comisión correctos.');
    }

  } catch (error) {
    console.error('Ocurrió un error durante la auditoría:', error);
  }
}

findMissingTechnicians().then(() => {
    console.log('\nScript finalizado.');
    process.exit(0);
}).catch(() => process.exit(1));
