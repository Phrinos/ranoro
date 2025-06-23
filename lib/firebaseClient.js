// lib/firebaseClient.js
//-------------------------------------------
// Inicializa Firebase solo una vez
//-------------------------------------------

// Importa lo esencial de Firebase v9+ (modular)
import { initializeApp, getApps } from 'firebase/app';      // Core
import { getAuth } from 'firebase/auth';                    // Autenticación
import { getStorage } from 'firebase/storage';              // Almacenamiento

//-------------------------------------------
// 1. Configuración del proyecto
//-------------------------------------------
// Se toma de variables de entorno (.env.local) para
// NO exponer claves en Git ni en el navegador.
const firebaseConfig = {
  apiKey:             process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:         process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:              process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

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
