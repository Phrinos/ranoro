
const admin = require('firebase-admin');
const { format } = require('date-fns');
const { toZonedTime } = require('date-fns-tz');
const serviceAccount = require('./firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const timeZone = 'America/Mexico_City';

/**
 * Normaliza una fecha a un objeto Date de JavaScript.
 * Acepta strings ISO, objetos Timestamp de Firestore, o números.
 * @param {any} dateInput - La fecha a normalizar.
 * @returns {Date | null} Un objeto Date o null si la entrada es inválida.
 */
function parseDate(dateInput) {
    if (!dateInput) return null;
    if (dateInput.toDate) return dateInput.toDate(); // Es un Timestamp de Firestore
    if (typeof dateInput === 'string' || typeof dateInput === 'number') {
        const date = new Date(dateInput);
        return isNaN(date.getTime()) ? null : date;
    }
    return null;
}

/**
 * Encuentra la mejor fecha disponible en un registro de servicio como fallback.
 * @param {object} service - El documento del servicio.
 * @returns {Date} La mejor fecha encontrada o la fecha actual.
 */
const getBestDate = (service) => {
    const zonedNow = toZonedTime(new Date(), timeZone);
    const date = parseDate(service.serviceDate) || 
               parseDate(service.receptionDateTime) ||
               parseDate(service.createdAt);
    return date ? toZonedTime(date, timeZone) : zonedNow;
};

async function migrateServiceFolios() {
    console.log('Iniciando migración de folios para servicios existentes...');

    const servicesRef = db.collection('serviceRecords');
    const allServicesSnapshot = await servicesRef.get();

    const servicesWithoutFolio = allServicesSnapshot.docs.filter(doc => !doc.data().folio);

    if (servicesWithoutFolio.length === 0) {
        console.log('No hay servicios sin folio. ¡Todo en orden!');
        return;
    }

    console.log(`Se encontraron ${servicesWithoutFolio.length} servicios sin folio.`);

    const servicesByDate = {};
    servicesWithoutFolio.forEach(doc => {
        const service = doc.data();
        const bestDate = getBestDate(service);
        const datePrefix = format(bestDate, 'yyMMdd');
        
        if (!servicesByDate[datePrefix]) {
            servicesByDate[datePrefix] = [];
        }
        servicesByDate[datePrefix].push({ id: doc.id, date: bestDate });
    });

    const batch = db.batch();
    let updatedCount = 0;

    for (const datePrefix of Object.keys(servicesByDate)) {
        console.log(`Procesando ${servicesByDate[datePrefix].length} servicios para la fecha ${datePrefix}...`);
        
        const counterRef = db.collection('counters').doc(`folio_${datePrefix}`);
        const counterDoc = await counterRef.get();
        let currentCount = counterDoc.exists ? counterDoc.data().count : 0;
        
        const services = servicesByDate[datePrefix].sort((a, b) => a.date - b.date);

        for (const service of services) {
            currentCount++;
            const folio = `${datePrefix}-${String(currentCount).padStart(4, '0')}`;
            const serviceRef = db.collection('serviceRecords').doc(service.id);
            batch.update(serviceRef, { folio });
            console.log(`  - Asignando folio ${folio} a servicio ${service.id}`);
            updatedCount++;
        }
        
        batch.set(counterRef, { count: currentCount }, { merge: true });
    }

    try {
        await batch.commit();
        console.log(`\n¡Éxito! Se migraron ${updatedCount} folios.`);
        console.log("Todos los servicios históricos ahora tienen un folio estandarizado.");
    } catch (error) {
        console.error('Error al ejecutar la migración:', error);
    }
}

migrateServiceFolios().catch(console.error);
