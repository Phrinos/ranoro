
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from './src/lib/firebaseClient.js';

async function testFirestoreConnection() {
  console.log("Iniciando prueba de conexión a Firestore...");
  try {
    // Apuntamos a una colección pública permitida por las reglas de seguridad de producción.
    const publicServicesCol = collection(db, "publicServices");
    const q = query(publicServicesCol, limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("✅ Conexión a Firestore exitosa, pero la colección 'publicServices' está vacía.");
    } else {
      console.log("✅ ¡Conexión a Firestore y lectura de datos exitosa!");
      querySnapshot.forEach(doc => {
        console.log("   => Documento de muestra encontrado en 'publicServices':", doc.id);
      });
    }
    process.exit(0);
  } catch (error) {
    console.error("❌ Error al conectar o consultar Firestore:", error);
    process.exit(1);
  }
}

// Establecer un tiempo de espera máximo para la prueba
setTimeout(() => {
  console.error("❌ Error: La prueba de conexión ha superado el tiempo de espera (15 segundos).");
  process.exit(1);
}, 15000);

testFirestoreConnection();
