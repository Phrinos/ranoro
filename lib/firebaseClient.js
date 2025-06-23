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
// Se toma de variables de entorno (.env.local) para
// NO exponer claves en Git ni en el navegador.
const firebaseConfig = {
  apiKey: "AIzaSyA_ot6L0zgglc1tC0BounxYIvj7y8048Sg",
  authDomain: "ranoro.mx",
  databaseURL: "https://ranoro-jm8l0-default-rtdb.firebaseio.com",
  projectId: "ranoro-jm8l0",
  storageBucket: "ranoro-jm8l0.firebasestorage.app",
  messagingSenderId: "290934350177",
  appId: "1:290934350177:web:2365c77eaca4bb0d906520"
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
export const db      = getFirestore(app); // Para la base de datos de la app
