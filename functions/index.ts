
// functions/index.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { startOfDay, endOfDay } from 'date-fns';
import { toZonedTime, formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';

admin.initializeApp();

const db = admin.firestore();
const TZ = 'America/Mexico_City';

// --- Daily Rental Charges Generation (fixed) ---
export const generateDailyRentalCharges = onSchedule(
  {
    schedule: '0 3 * * *', // 03:00 todos los días
    timeZone: TZ,
  },
  async () => {
    logger.info('Starting daily rental charge generation...');
    
    // Obtiene la fecha y hora actual directamente en la zona horaria de México.
    // Esto es crucial para asegurar que el día es el correcto (ej. 16 de Oct a las 3am es 16 de Oct).
    const nowInMexico = toZonedTime(new Date(), TZ);
    
    // Calcula el inicio y fin del DÍA ACTUAL en la zona horaria de México.
    const startOfTodayInMexico = startOfDay(nowInMexico);
    const endOfTodayInMexico = endOfDay(nowInMexico);

    // Convierte estas fechas a objetos Date de UTC para consistencia en Firestore.
    // Esta es la corrección clave para evitar el desfase.
    const startOfTodayUtc = zonedTimeToUtc(startOfTodayInMexico, TZ);
    const endOfTodayUtc = zonedTimeToUtc(endOfTodayInMexico, TZ);
    
    // El dateKey se formatea a partir de la fecha correcta en México.
    const dateKey = formatInTimeZone(nowInMexico, TZ, 'yyyy-MM-dd');

    const activeDriversSnap = await db
      .collection('drivers')
      .where('isArchived', '==', false)
      .where('assignedVehicleId', '!=', null)
      .get();

    if (activeDriversSnap.empty) {
      logger.info('No active drivers with assigned vehicles found.');
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
          `Vehicle ${vehicleId} for driver ${driver.name} not found or has no daily rental cost.`
        );
        return;
      }

      const chargeId = `${driverDoc.id}_${dateKey}`;
      const chargeRef = db.collection('dailyRentalCharges').doc(chargeId);

      try {
        await chargeRef.create({
          driverId: driverDoc.id,
          vehicleId,
          amount: dailyRentalCost,
          vehicleLicensePlate: vehicle?.licensePlate || '',
          // El Timestamp se crea a partir de la fecha correcta de inicio del día en UTC.
          date: admin.firestore.Timestamp.fromDate(startOfTodayUtc),
          dateKey,
          dayStartUtc: admin.firestore.Timestamp.fromDate(startOfTodayUtc),
          dayEndUtc: admin.firestore.Timestamp.fromDate(endOfTodayUtc),
        });
        logger.info(`Created daily charge for ${driver.name} (${dateKey}).`);
      } catch (err: any) {
        if (err?.code === 6 || err?.code === 'ALREADY_EXISTS') {
          logger.info(`Charge already exists for ${driver.name} (${dateKey}).`);
        } else {
          logger.error(`Failed to create charge for ${driver.name}:`, err);
        }
      }
    });

    await Promise.all(ops);
    logger.info('Daily rental charge generation finished successfully.');
  }
);
