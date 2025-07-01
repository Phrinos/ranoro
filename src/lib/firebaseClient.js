// lib/firebaseClient.js
//-------------------------------------------
// Inicializa Firebase solo una vez
//-------------------------------------------

// Importa lo esencial de Firebase v9+ (modular)
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

//-------------------------------------------
// 1. Configuración del proyecto
//-------------------------------------------
// Se utilizan las credenciales del proyecto de Firebase.
const firebaseConfig = {
  apiKey: "AIzaSyA_ot6L0zgglc1tC0BounxYIvj7y8048Sg",
  authDomain: "ranoro-jm8l0.firebaseapp.com",
  projectId: "ranoro-jm8l0",
  storageBucket: "ranoro-jm8l0.appspot.com",
  messagingSenderId: "290934350177",
  appId: "1:290934350177:web:2365c77eaca4bb0d906520",
};


// --- Variables para exportar ---
let app;
let auth = null;
let storage = null;
let db = null;

//-------------------------------------------
// 2. Crear/obtener la app de Firebase
//-------------------------------------------
// Solo inicializa Firebase si las credenciales son válidas.
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSyA_ot6L0zgglc1tC0BounxYIvj7y8048Sg_REPLACE_ME") {
  // Evita reinicializar en el entorno de desarrollo de Next.js
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
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
