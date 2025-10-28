// functions/src/index.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';
import { Timestamp } from 'firebase-admin/firestore';
import { onStockExit, onPurchaseCreated, onPurchaseUpdated, adjustStock } from './inventory';

// Inicializar Firebase Admin SDK una sola vez
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Zona horaria fija UTC-6 (sin horario de verano).
 * Nota: En la convención "Etc", el signo es inverso:
 *   Etc/GMT+6 => UTC-6
 * Esto garantiza que SIEMPRE sea 15:00 (3 PM) en UTC-6.
 * Si prefieres zona geográfica con DST, usa "America/Mexico_City" o "America/Monterrey".
 */
const TZ = 'Etc/GMT+6';

// --- Generación diaria de cargos de renta ---
export const generateDailyRentalCharges = onSchedule(
  {
    schedule: '0 15 * * *', // Todos los días a las 15:00
    timeZone: TZ,           // Interpretado como UTC-6 fijo
  },
  async () => {
    logger.info('Iniciando generación de cargos diarios de renta...');

    // "Hoy" según la zona UTC-6
    const now = new Date();
    const dateKey = formatInTimeZone(now, TZ, 'yyyy-MM-dd');

    // Límites del día "local" (UTC-6) convertidos a UTC para guardar/consultar de forma consistente
    const dayStartUtc = zonedTimeToUtc(`${dateKey}T00:00:00.000`, TZ);
    const dayEndUtc   = zonedTimeToUtc(`${dateKey}T23:59:59.999`, TZ);

    const activeDriversSnap = await db
      .collection('drivers')
      .where('isArchived', '==', false)
      .where('assignedVehicleId', '!=', null)
      .get();

    if (activeDriversSnap.empty) {
      logger.info('No hay conductores activos con vehículo asignado.');
      return;
    }

    await Promise.all(
      activeDriversSnap.docs.map(async (driverDoc) => {
        const driver = driverDoc.data() as any;
        const vehicleId = driver.assignedVehicleId as string | undefined;
        if (!vehicleId) return;

        const vehicleDoc = await db.collection('vehicles').doc(vehicleId).get();
        const vehicle = vehicleDoc.data() as any;

        const dailyRentalCost = vehicle?.dailyRentalCost;
        if (!vehicleDoc.exists || dailyRentalCost == null) {
          logger.warn(
            `Vehículo ${vehicleId} para conductor ${driver?.name ?? driverDoc.id} no encontrado o sin costo de renta diario.`
          );
          return;
        }

        // Un cargo por conductor por día (clave estable con la fecha local UTC-6)
        const chargeId = `${driverDoc.id}_${dateKey}`;
        const chargeRef = db.collection('dailyRentalCharges').doc(chargeId);

        try {
          await chargeRef.create({
            driverId: driverDoc.id,
            vehicleId,
            amount: dailyRentalCost,
            vehicleLicensePlate: vehicle?.licensePlate ?? '',
            // Mantén "date" por compatibilidad (timestamp de creación del cargo)
            date: Timestamp.fromDate(now),
            // Además guardamos una marca explícita
            createdAt: Timestamp.fromDate(now),
            // Clave del día en curso (en UTC-6)
            dateKey,
            // Ventana del día en UTC para consultas/agrupaciones consistentes
            dayStartUtc: Timestamp.fromDate(dayStartUtc),
            dayEndUtc: Timestamp.fromDate(dayEndUtc),
          });

          logger.info(`Cargo creado para ${driver?.name ?? driverDoc.id} (${dateKey}).`);
        } catch (err: any) {
          // create() falla si el doc ya existe
          if (err?.code === 6 || err?.code === 'ALREADY_EXISTS') {
            logger.info(`El cargo ya existía para ${driver?.name ?? driverDoc.id} (${dateKey}).`);
          } else {
            logger.error(`Error creando el cargo para ${driver?.name ?? driverDoc.id}:`, err);
          }
        }
      })
    );

    logger.info('Generación de cargos diarios finalizada correctamente.');
  }
);

// --- Funciones de Inventario ---
export { onStockExit, onPurchaseCreated, onPurchaseUpdated, adjustStock };
