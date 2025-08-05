
/**
 * ----------------------------------------------------------
 * Firebase Public Client
 * ----------------------------------------------------------
 * This module provides a simplified and secure way to access
 * Firestore for public-facing parts of the application.
 * It re-exports the `db` instance from `firebaseClient.js`
 * to ensure a single, consistent Firebase connection.
 * ----------------------------------------------------------
 */
import { db } from './firebaseClient';

// Re-export the Firestore instance for public use.
export { db };
