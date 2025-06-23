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

// Chequeo de seguridad para asegurar que las credenciales fueron cambiadas.
if (firebaseConfig.apiKey.startsWith("TU_") || firebaseConfig.projectId.startsWith("TU_")) {
    console.warn(`
        *******************************************************************************
        * ADVERTENCIA: La configuración de Firebase no ha sido establecida.           *
        *                                                                             *
        * Por favor, edita el archivo 'lib/firebaseClient.js' y reemplaza los valores *
        * de marcador de posición con las credenciales reales de tu proyecto.         *
        *******************************************************************************
    `);
}


//-------------------------------------------
// 2. Crear/obtener la app de Firebase
//-------------------------------------------
// Next.js recarga módulos en desarrollo; getApps()
// evita el error “Firebase App named '[DEFAULT]' already exists”.
const app = !getApps().length ? initializeApp(firebaseConfig)
                              : getApps()[0];

//-------------------------------------------
// 3. Exportar instancias listas para usar
//-------------------------------------------
// Las podrás importar donde las necesites:
export const auth    = getAuth(app);     // Para login/signup
export const storage = getStorage(app);  // Para subir/descargar archivos
export const db      = getFirestore(app); // Para la base de datos de la app
