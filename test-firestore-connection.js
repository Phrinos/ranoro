
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from './src/lib/firebaseClient.js';

async function testFirestoreConnection() {
  console.log("Iniciando prueba de conexión a Firestore...");
  try {
    // Intentamos obtener 1 documento de la colección 'serviceRecords'
    const serviceRecordsCol = collection(db, "serviceRecords");
    const q = query(serviceRecordsCol, limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("✅ Conexión a Firestore exitosa, pero la colección 'serviceRecords' está vacía o no contiene documentos.");
    } else {
      console.log("✅ ¡Conexión a Firestore y lectura de datos exitosa!");
      querySnapshot.forEach(doc => {
        console.log("   => Documento de muestra encontrado:", doc.id);
        // console.log(doc.data()); // Descomentar para ver datos completos
      });
    }
    // Forzar la salida del script para evitar que se quede colgado
    process.exit(0);
  } catch (error) {
    console.error("❌ Error al conectar o consultar Firestore:", error);
    // Forzar la salida del script con un código de error
    process.exit(1);
  }
}

// Establecer un tiempo de espera máximo para la prueba
setTimeout(() => {
  console.error("❌ Error: La prueba de conexión ha superado el tiempo de espera (15 segundos).");
  process.exit(1);
}, 15000);


testFirestoreConnection();
