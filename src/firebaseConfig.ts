// src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// ⚠️ Pega aquí tus propias claves
const firebaseConfig = {
    apiKey: "AIzaSyA_ot6L0zgglc1tC0BounxYIvj7y8048Sg",
    authDomain: "ranoro-jm8l0.firebaseapp.com",
    databaseURL: "https://ranoro-jm8l0-default-rtdb.firebaseio.com",
    projectId: "ranoro-jm8l0",
    storageBucket: "ranoro-jm8l0.firebasestorage.app",
    messagingSenderId: "290934350177",
    appId: "1:290934350177:web:2365c77eaca4bb0d906520"
  };

const app = initializeApp(firebaseConfig);

// Exporta la base de datos para poder usarla en cualquier archivo
export const db = getFirestore(app);
