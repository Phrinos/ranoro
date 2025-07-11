// lib/firebaseClient.js
// ---------------------------------------------------
// CONEXIÓN A FIREBASE DESACTIVADA PARA MODO LOCAL
// ---------------------------------------------------

// import { initializeApp, getApps, getApp } from "firebase/app";
// import { getFirestore } from "firebase/firestore";
// import { getStorage } from "firebase/storage";
// import { getAuth } from "firebase/auth";

// const firebaseConfig = {
//   apiKey: "AIzaSyA_ot6L0zgglc1tC0BounxYIvj7y8048Sg",
//   authDomain: "ranoro-jm8l0.firebaseapp.com",
//   projectId: "ranoro-jm8l0",
//   storageBucket: "ranoro-jm8l0.firebasestorage.app",
//   messagingSenderId: "290934350177",
//   appId: "1:290934350177:web:2365c77eaca4bb0d906520",
// };

// const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// export const db = getFirestore(app);
// export const storage = getStorage(app);
// export const auth = typeof window !== "undefined" ? getAuth(app) : null;
// export { app };

// --- CONFIGURACIÓN PARA MODO LOCAL ---
export const db = null;
export const storage = null;
export const auth = null;
export const app = null;
