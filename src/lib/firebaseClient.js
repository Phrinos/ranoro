
// lib/firebaseClient.js
//-------------------------------------------
// Inicializa Firebase solo una vez
//-------------------------------------------

// Importa lo esencial de Firebase v9+ (modular)
import { initializeApp, getApps } from 'firebase/app';      // Core
import { getAuth } from 'firebase/auth';                    // Autenticación
import { getStorage } from 'firebase/storage';              // Almacenamiento
import { getFirestore } from 'firebase/firestore';          // Base de datos

//-------------------------------------------
// 1. Configuración del proyecto
//-------------------------------------------
// ¡IMPORTANTE! Reemplaza los valores de marcador de posición a continuación
// con la configuración real de tu proyecto de Firebase.
// Puedes encontrarla en la consola de Firebase, en la configuración de tu proyecto.
// (Project settings -> General -> Your apps -> Firebase SDK snippet -> Config)
const firebaseConfig = {
  apiKey:             "TU_API_KEY_AQUI", // Ejemplo: "AIzaSy..."
  authDomain:         "TU_AUTH_DOMAIN_AQUI", // Ejemplo: "tu-proyecto.firebaseapp.com"
  projectId:          "TU_PROJECT_ID_AQUI", // Ejemplo: "tu-proyecto"
  storageBucket:      "TU_STORAGE_BUCKET_AQUI", // Ejemplo: "tu-proyecto.appspot.com"
  messagingSenderId:  "TU_MESSAGING_SENDER_ID_AQUI", // Ejemplo: "1234567890"
  appId:              "TU_APP_ID_AQUI", // Ejemplo: "1:1234567890:web:abcdef123456"
};


// --- Variables para exportar ---
let auth = null;
let storage = null;
let db = null;

//-------------------------------------------
// 2. Crear/obtener la app de Firebase
//-------------------------------------------
// Solo inicializa Firebase si las credenciales NO son los placeholders.
if (firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("TU_")) {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  storage = getStorage(app);
  db = getFirestore(app);
} else {
    // Muestra una advertencia clara en la consola del navegador si las credenciales no están configuradas.
    if (typeof window !== 'undefined') {
        console.warn(`
            *******************************************************************************
            * ADVERTENCIA: La configuración de Firebase no ha sido establecida.           *
            *                                                                             *
            * Por favor, edita el archivo 'lib/firebaseClient.js' con tus credenciales.   *
            * La aplicación se ejecutará en MODO DEMO sin conexión a Firebase.            *
            *******************************************************************************
        `);
    }
}

//-------------------------------------------
// 3. Exportar instancias (que podrían ser null si no hay configuración)
//-------------------------------------------
export { auth, storage, db };
