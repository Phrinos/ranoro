// src/functions/src/index.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { getAdminDb, serverTimestamp } from '@/lib/firebaseAdmin';
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { onStockExit, onPurchaseCreated, onPurchaseUpdated, adjustStock } from './inventory';

// Obtén la instancia de la base de datos desde el módulo centralizado
const db = getAdminDb();
const TZ = 'America/Mexico_City';

// --- Daily Rental Charges Generation ---
export const generateDailyRentalCharges = onSchedule(
  {
    schedule: '0 8 * * *', // 08:00 todos los días (Hora CDMX)
    timeZone: TZ,
  },
  async () => {
    logger.info('Iniciando generación automática de cargos diarios...');
    
    // Obtener la fecha actual en la zona horaria de México
    const nowInMexico = toZonedTime(new Date(), TZ);
    const dateKey = formatInTimeZone(nowInMexico, TZ, 'yyyy-MM-dd');
    
    // Definir el inicio y fin del día para el registro del timestamp
    const startOfTodayInMexico = startOfDay(nowInMexico);
    const endOfTodayInMexico = endOfDay(nowInMexico);
    
    logger.info(`Generando cargos para la fecha: ${dateKey}`);

    const activeDriversSnap = await db
      .collection('drivers')
      .where('isArchived', '==', false)
      .where('assignedVehicleId', '!=', null)
      .get();

    if (activeDriversSnap.empty) {
      logger.info('No se encontraron conductores activos con vehículos asignados.');
      return;
    }

    const ops = activeDriversSnap.docs.map(async (driverDoc) => {
      const driver = driverDoc.data() as any;
      const vehicleId = driver.assignedVehicleId as string | undefined;
      if (!vehicleId) return;

      const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
      const vehicle = vehicleDoc.data() as any;

      const dailyRentalCost = vehicle?.dailyRentalCost;
      if (!vehicleDoc.exists || !dailyRentalCost) {
        logger.warn(
          `Vehículo ${vehicleId} para el conductor ${driver.name} no encontrado o no tiene costo de renta diario.`
        );
        return;
      }

      // El ID del cargo es compuesto por driverId + fecha para evitar duplicidad por reintentos
      const chargeId = `${driverDoc.id}_${dateKey}`;
      const chargeRef = db.collection('dailyRentalCharges').doc(chargeId);

      try {
        await chargeRef.create({
          driverId: driverDoc.id,
          vehicleId,
          amount: dailyRentalCost,
          vehicleLicensePlate: vehicle?.licensePlate || '',
          date: serverTimestamp(), // Fecha de creación real
          dateKey, // Fecha administrativa del cargo (YYYY-MM-DD)
          dayStartUtc: startOfTodayInMexico,
          dayEndUtc: endOfTodayInMexico,
          note: `Cargo automático de renta diaria - ${dateKey}`
        });
        logger.info(`Cargo creado para ${driver.name} (${dateKey}).`);
      } catch (err: any) {
        // Código 6 es ALREADY_EXISTS en Firestore
        if (err?.code === 6 || err?.code === 'ALREADY_EXISTS') {
          logger.info(`El cargo ya existe para ${driver.name} (${dateKey}). Omitiendo.`);
        } else {
          logger.error(`Error al crear cargo para ${driver.name}:`, err);
        }
      }
    });

    await Promise.all(ops);
    logger.info('Proceso de generación de cargos diarios finalizado con éxito.');
  }
);

// --- Inventory Functions ---
export { onStockExit, onPurchaseCreated, onPurchaseUpdated, adjustStock };
