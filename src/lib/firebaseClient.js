// lib/firebaseClient.js
//-------------------------------------------
// Inicializa Firebase solo una vez de forma segura
//-------------------------------------------

// Importa lo esencial de Firebase v9+ (modular)
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

//-------------------------------------------
// 1. Configuración del proyecto
//-------------------------------------------
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
// 2. Crear/obtener la app de Firebase de forma segura
//-------------------------------------------
// Solo inicializa Firebase si las credenciales son válidas y no es un placeholder.
if (firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith("AIza")) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  
  // Asigna las instancias de servicio solo si la app se inicializó correctamente
  auth = getAuth(app);
  storage = getStorage(app);
  db = getFirestore(app);

} else if (typeof window !== 'undefined') {
  // Muestra una advertencia si se está en el navegador y la configuración no es válida.
  console.warn(
    "MODO DEMO: La conexión a Firebase no está disponible. La aplicación usará datos locales."
  );
}

//-------------------------------------------
// 3. Exportar instancias (que podrían ser null si no hay configuración)
//-------------------------------------------
export { auth, storage, db };
