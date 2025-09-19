
// migrate-commissions-v2.js
const admin = require('firebase-admin');

// --- Configuración ---
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

async function migrateCommissionsV2() {
  const isDryRun = !process.argv.includes('--execute');

  console.log('----------------------------------------------------');
  console.log(`Iniciando script de MIGRACIÓN v2 en modo: ${isDryRun ? 'SIMULACIÓN (Dry Run)' : 'EJECUCIÓN (CON ESCRITURA)'}`);
  console.log('----------------------------------------------------');

  try {
    const usersSnapshot = await db.collection('users').get();
    const allUsers = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      normalizedName: normalizeName(doc.data().name)
    }));
    const userIdToUserMap = new Map(allUsers.map(u => [u.id, u]));
    console.log(`${allUsers.length} perfiles de usuario cargados.`);

    // 1. Obtener TODOS los servicios entregados
    const servicesQuery = db.collection('serviceRecords').where('status', '==', 'Entregado');
    const servicesSnapshot = await servicesQuery.get();
    console.log(`Se encontraron ${servicesSnapshot.size} servicios entregados en total.`);

    const batch = db.batch();
    let servicesToMigrateCount = 0;

    for (const doc of servicesSnapshot.docs) {
      const service = doc.data();
      const serviceId = doc.id;
      
      // 2. Verificar en el código si el servicio ya fue migrado
      if (typeof service.totalCommission === 'number') {
        continue; // Si ya tiene una comisión numérica, lo saltamos.
      }

      console.log(`\n[!] Servicio por migrar. Folio: ${service.folio || serviceId.slice(0, 10)}...`);
      servicesToMigrateCount++;

      const serviceTotal = service.total || service.price || (service.payments && service.payments[0] ? service.payments[0].amount : 0);
      let technicianId = service.technicianId;
      
      if (!technicianId && service.technicianName) {
          const normalizedName = normalizeName(service.technicianName);
          const matches = allUsers.filter(u => u.normalizedName.includes(normalizedName));
          if (matches.length === 1) {
              technicianId = matches[0].id;
              console.log(`  - Técnico vinculado por nombre: "${service.technicianName}" -> ${matches[0].name}`);
          }
      }

      // Si después de todo no tenemos un técnico, lo reportamos y continuamos.
      if (!technicianId) {
          console.log(`  - ⚠️ AVISO: No se pudo determinar un técnico. Se omite.`);
          continue;
      }
       if (serviceTotal === 0) {
          console.log(`  - ⚠️ AVISO: El monto del servicio es cero. Se omite.`);
          continue;
      }

      const technician = userIdToUserMap.get(technicianId);
      if (!technician || typeof technician.commissionRate !== 'number' || technician.commissionRate <= 0) {
          console.log(`  - ⚠️ AVISO: El técnico "${technician?.name || 'ID: '+technicianId}" no tiene un % de comisión válido (${technician?.commissionRate}). Se omite.`);
          continue;
      }

      const commissionRate = technician.commissionRate / 100;
      const totalCommission = serviceTotal * commissionRate;
      console.log(`  - Cálculo: $${serviceTotal} * ${technician.commissionRate}% = $${totalCommission.toFixed(2)} de comisión para ${technician.name}.`);

      const updatedServiceItems = (service.serviceItems && service.serviceItems.length > 0 ? service.serviceItems : [{name: 'Servicio General', sellingPrice: 0}]).map((item, index) => {
          const isMainItem = index === 0;
          return {
              ...item,
              technicianId: technicianId,
              technicianName: technician.name,
              sellingPrice: isMainItem ? serviceTotal : (item.sellingPrice || 0),
              technicianCommission: isMainItem ? totalCommission : (item.technicianCommission || 0),
          };
      });

      const serviceRef = db.collection('serviceRecords').doc(serviceId);
      batch.update(serviceRef, {
          serviceItems: updatedServiceItems,
          totalCommission: totalCommission
      });
      console.log(`  - ✅ PREPARADO PARA MIGRACIÓN.`);
    }

    console.log('\n--- Resumen de la Migración v2 ---');
    console.log(`Se procesarán un total de ${servicesToMigrateCount} servicios.`);
    
    if (isDryRun) {
      console.log('\nModo SIMULACIÓN finalizado. No se ha escrito nada en la base de datos.');
      if (servicesToMigrateCount > 0) {
        console.log('Para aplicar estos cambios, ejecuta el script con la bandera "--execute".');
        console.log('Comando: node migrate-commissions-v2.js --execute');
      }
    } else {
      if (servicesToMigrateCount > 0) {
        console.log('\nEjecutando escritura en la base de datos...');
        await batch.commit();
        console.log('¡MIGRACIÓN COMPLETADA! Los datos históricos han sido actualizados.');
      } else {
        console.log('No hubo servicios que necesitaran ser migrados.');
      }
    }

  } catch (error) {
    console.error('Ocurrió un error durante la migración:', error);
  }
}

migrateCommissionsV2().then(() => {
    console.log('\nScript finalizado.');
    process.exit(0);
}).catch(() => process.exit(1));
