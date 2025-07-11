// lib/firebaseClient.js
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAuth } from 'firebase/auth'

/* ----------------------------------------------------------
   1.  Configuración: Centralizada
   ---------------------------------------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyA_ot6L0zgglc1tC0BounxYIvj7y8048Sg",
  authDomain: "ranoro-jm8l0.firebaseapp.com",
  projectId: "ranoro-jm8l0",
  storageBucket: "ranoro-jm8l0.firebasestorage.app",
  messagingSenderId: "290934350177",
  appId: "1:290934350177:web:2365c77eaca4bb0d906520",
};

/* ----------------------------------------------------------
   2.  Inicializa (sin duplicar apps si hace HMR)
   ---------------------------------------------------------- */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

/* ----------------------------------------------------------
   3.  Exporta los SDK listos para usar
   ---------------------------------------------------------- */
export const db = getFirestore(app)
export const storage = getStorage(app)

// Solo inicializa auth en el lado del cliente para evitar errores del lado del servidor.
export const auth = typeof window !== 'undefined' ? getAuth(app) : null;

export { app } // por si lo necesitas en otra parte