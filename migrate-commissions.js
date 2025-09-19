
// migrate-commissions.js
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

async function migrateCommissions() {
  // Modo seguro: por defecto es un "dry run" (simulación).
  // Para ejecutar los cambios, se debe correr el script con: node migrate-commissions.js --execute
  const isDryRun = !process.argv.includes('--execute');

  console.log('----------------------------------------------------');
  console.log(`Iniciando script de MIGRACIÓN en modo: ${isDryRun ? 'SIMULACIÓN (Dry Run)' : 'EJECUCIÓN (CON ESCRITURA)'}`);
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

    // 1. Identificar servicios antiguos (Entregados pero sin totalCommission)
    const servicesQuery = db.collection('serviceRecords')
      .where('status', '==', 'Entregado')
      .where('totalCommission', '==', null);
      
    const servicesSnapshot = await servicesQuery.get();
    console.log(`Se encontraron ${servicesSnapshot.size} servicios antiguos para procesar.`);

    if (servicesSnapshot.empty) {
        console.log("No hay servicios que necesiten migración.");
        return;
    }

    const batch = db.batch();
    let servicesMigratedCount = 0;

    for (const doc of servicesSnapshot.docs) {
      const service = doc.data();
      const serviceId = doc.id;
      let needsUpdate = false;
      
      console.log(`\nInspeccionando Servicio Folio: ${service.folio || serviceId.slice(0, 10)}...`);

      // 2. Extraer datos del formato antiguo
      const serviceTotal = service.amount || service.price || service.total || 0;
      let technicianId = service.technicianId;
      
      if (!technicianId && service.technicianName) {
          const normalizedName = normalizeName(service.technicianName);
          const matches = allUsers.filter(u => u.normalizedName.includes(normalizedName));
          if (matches.length === 1) {
              technicianId = matches[0].id;
              console.log(`  - Técnico vinculado por nombre: "${service.technicianName}" -> ${matches[0].name}`);
          }
      }

      if (!technicianId) {
          console.log(`  - ⚠️ AVISO: No se pudo determinar un técnico para este servicio. Se omite.`);
          continue;
      }
      if (serviceTotal === 0) {
          console.log(`  - ⚠️ AVISO: El monto del servicio es cero. No se pueden calcular comisiones. Se omite.`);
          continue;
      }

      const technician = userIdToUserMap.get(technicianId);
      if (!technician || !technician.commissionRate || technician.commissionRate <= 0) {
          console.log(`  - ⚠️ AVISO: El técnico asignado no tiene un porcentaje de comisión válido. Se omite.`);
          continue;
      }

      // 3. Calcular la comisión
      const commissionRate = technician.commissionRate / 100;
      const totalCommission = serviceTotal * commissionRate;
      console.log(`  - Cálculo: $${serviceTotal} * ${technician.commissionRate}% = $${totalCommission.toFixed(2)} de comisión para ${technician.name}.`);

      // 4. Reestructurar los serviceItems
      const updatedServiceItems = (service.serviceItems || [{name: 'Servicio General', sellingPrice: 0}]).map((item, index) => {
          const isMainItem = index === 0; // Asumimos que el primer item es el principal
          return {
              ...item,
              technicianId: technicianId,
              technicianName: technician.name,
              // Asignamos el precio total al primer item para mantener la integridad del total
              sellingPrice: isMainItem ? serviceTotal : (item.sellingPrice || 0),
              // La comisión del item es la comisión total, asignada al item principal
              technicianCommission: isMainItem ? totalCommission : (item.technicianCommission || 0),
          };
      });

      const serviceRef = db.collection('serviceRecords').doc(serviceId);
      batch.update(serviceRef, {
          serviceItems: updatedServiceItems,
          totalCommission: totalCommission
      });
      servicesMigratedCount++;
      needsUpdate = true;

      if(needsUpdate) console.log(`  - ✅ PREPARADO PARA MIGRACIÓN.`);
    }

    console.log('\n--- Resumen de la Migración ---');
    console.log(`Se procesarán un total de ${servicesMigratedCount} servicios.`);
    
    if (isDryRun) {
      console.log('\nModo SIMULACIÓN finalizado. No se ha escrito nada en la base de datos.');
      console.log('Para aplicar estos cambios, ejecuta el script con la bandera "--execute".');
      console.log('Comando: node migrate-commissions.js --execute');
    } else {
      if (servicesMigratedCount > 0) {
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

migrateCommissions().then(() => {
    console.log('\nScript finalizado.');
    process.exit(0);
}).catch(() => process.exit(1));
