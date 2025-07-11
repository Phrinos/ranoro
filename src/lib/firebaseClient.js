// lib/firebaseClient.js
// ---------------------------------------------------
// Inicializa Firebase de forma segura (v9 modular)
// ---------------------------------------------------
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// ---------------------------------------------------
// 1. Configuración de Firebase (Producción)
//    Estas son las credenciales para el entorno en vivo.
// ---------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyA_ot6L0zgglc1tC0BounxYIvj7y8048Sg",
  authDomain: "ranoro-jm8l0.firebaseapp.com",
  projectId: "ranoro-jm8l0",
  storageBucket: "ranoro-jm8l0.firebasestorage.app",
  messagingSenderId: "290934350177",
  appId: "1:290934350177:web:2365c77eaca4bb0d906520",
};


// ---------------------------------------------------
// 2. Inicializa la app solo una vez
// ---------------------------------------------------
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ---------------------------------------------------
// 3. Servicios comunes (Firestore y Storage)
// ---------------------------------------------------
export const db = getFirestore(app);
export const storage = getStorage(app);

// Auth solo en cliente (evita cargar en SSR)
export const auth =
  typeof window !== "undefined" ? getAuth(app) : null;

// Exporta la app por si la necesitas en otras libs
export { app };
