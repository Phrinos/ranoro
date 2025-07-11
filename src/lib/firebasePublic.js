// src/lib/firebasePublic.js
// Este archivo ahora importa la configuración centralizada de firebaseClient.js
// para asegurar que toda la aplicación use la misma conexión.

import { db } from './firebaseClient';

// Exporta solo la instancia de Firestore para acceso público.
export { db };
