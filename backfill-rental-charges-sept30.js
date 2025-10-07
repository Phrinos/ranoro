// backfill-rental-charges-sept30.js
const admin = require('firebase-admin');
const { differenceInCalendarDays, addDays, startOfDay, format } = require('date-fns');

// --- INSTRUCCIONES DE AUTENTICACIÓN ---
// 1. Descarga tu clave de cuenta de servicio JSON desde Firebase Console.
// 2. Renombra el archivo a "firebase-admin-key.json" y colócalo en la raíz de tu proyecto.
try {
  const serviceAccount = require('./firebase-admin-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('*********************************************************************');
  console.error('ERROR: Archivo de credenciales no encontrado.');
  console.error('Por favor, descarga tu "firebase-admin-key.json" de la consola de Firebase');
  console.error('y colócalo en la raíz de tu proyecto para que el script pueda ejecutarse.');
  console.error('*********************************************************************');
  process.exit(1);
}

const db = admin.firestore();

/**
 * Normaliza una fecha a un objeto Date de JavaScript.
 * @param {any} dateInput - La fecha a normalizar.
 * @returns {Date | null} Un objeto Date o null si la entrada es inválida.
 */
function parseDate(dateInput) {
    if (!dateInput) return null;
    if (dateInput.toDate) return dateInput.toDate(); // Timestamp de Firestore
    if (typeof dateInput === 'string' || typeof dateInput === 'number') {
        const date = new Date(dateInput);
        return isNaN(date.getTime()) ? null : date;
    }
    return null;
}

async function backfillRentalCharges() {
  const startDate = startOfDay(new Date('2025-09-30T06:00:00.000Z')); // 30 de Septiembre, ajustado a UTC
  const today = startOfDay(new Date());

  console.log(`Iniciando proceso de corrección de cargos de renta desde ${format(startDate, 'dd/MM/yyyy')} hasta ${format(today, 'dd/MM/yyyy')}...`);

  const driversRef = db.collection('drivers');
  const vehiclesRef = db.collection('vehicles');
  const chargesRef = db.collection('dailyRentalCharges');

  const activeDriversSnap = await driversRef.where('isArchived', '==', false).where('assignedVehicleId', '!=', null).get();

  if (activeDriversSnap.empty) {
    console.log("No se encontraron conductores activos con vehículos asignados. Proceso finalizado.");
    return;
  }

  console.log(`Se encontraron ${activeDriversSnap.size} conductores activos para revisar.`);
  let totalChargesCreated = 0;

  for (const driverDoc of activeDriversSnap.docs) {
    const driver = driverDoc.data();
    const vehicleId = driver.assignedVehicleId;

    if (!vehicleId) {
      console.log(`- [AVISO] Conductor ${driver.name} omitido: no tiene vehículo asignado.`);
      continue;
    }

    const vehicleDoc = await vehiclesRef.doc(vehicleId).get();
    if (!vehicleDoc.exists() || !vehicleDoc.data()?.dailyRentalCost) {
      console.log(`- [AVISO] Conductor ${driver.name} omitido: vehículo ${vehicleId} no encontrado o sin costo de renta.`);
      continue;
    }
    
    const vehicle = vehicleDoc.data();
    const dailyCost = vehicle.dailyRentalCost;
    
    console.log(`\nRevisando a ${driver.name} con vehículo ${vehicle.licensePlate}...`);

    const totalDays = differenceInCalendarDays(today, startDate) + 1;
    if (totalDays <= 0) {
      console.log('  -> No hay días para revisar en el rango especificado.');
      continue;
    }
    
    // Obtener todos los cargos existentes para este conductor en un solo query
    const existingChargesSnap = await chargesRef
      .where('driverId', '==', driverDoc.id)
      .where('date', '>=', startDate)
      .get();
      
    const existingChargeDates = new Set(
      existingChargesSnap.docs.map(doc => format(doc.data().date.toDate(), 'yyyy-MM-dd'))
    );

    const batch = db.batch();
    let chargesAddedForDriver = 0;

    for (let i = 0; i < totalDays; i++) {
        const dateToCheck = startOfDay(addDays(startDate, i));
        const dateKey = format(dateToCheck, 'yyyy-MM-dd');

        if (!existingChargeDates.has(dateKey)) {
            console.log(`  -> Creando cargo faltante para el día: ${dateKey}`);
            const newChargeRef = chargesRef.doc(); // Firestore generará un ID único
            batch.set(newChargeRef, {
                driverId: driverDoc.id,
                vehicleId: vehicleId,
                date: admin.firestore.Timestamp.fromDate(dateToCheck),
                amount: dailyCost,
                vehicleLicensePlate: vehicle.licensePlate || '',
            });
            chargesAddedForDriver++;
        }
    }
    
    if (chargesAddedForDriver > 0) {
      await batch.commit();
      console.log(`  -> Se crearon ${chargesAddedForDriver} cargos para ${driver.name}.`);
      totalChargesCreated += chargesAddedForDriver;
    } else {
      console.log(`  -> ${driver.name} está al día. No se crearon nuevos cargos.`);
    }
  }

  console.log("\n-------------------------------------------");
  console.log("Proceso de corrección finalizado.");
  console.log(`Total de cargos creados en esta ejecución: ${totalChargesCreated}`);
  console.log("-------------------------------------------");
}

backfillRentalCharges().catch(error => {
  console.error("Ocurrió un error catastrófico durante el proceso:", error);
  process.exit(1);
});
