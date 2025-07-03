import * as admin from 'firebase-admin';

// This file is for server-side use only.
// It initializes the Firebase Admin SDK, which requires server environment credentials.
// In many environments (like Google Cloud Functions, Cloud Run), credentials are
// automatically discovered if not provided explicitly.

let adminDb: admin.firestore.Firestore;

// Check if the app is already initialized to prevent errors in hot-reloading environments
if (!admin.apps.length) {
  try {
    // Explicitly providing the projectId can sometimes help in complex environments.
    const projectId = process.env.GCLOUD_PROJECT;
    
    if (projectId) {
        console.log(`Initializing Firebase Admin SDK for project: ${projectId}`);
        admin.initializeApp({ projectId });
    } else {
        console.log("Initializing Firebase Admin SDK using default credentials (no GCLOUD_PROJECT found).");
        admin.initializeApp();
    }
  } catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
  }
}

// We still try to get firestore instance, but it might fail if initialization failed.
// Components using adminDb should handle the case where it might be undefined.
try {
  adminDb = admin.firestore();
} catch (error) {
  console.error('Could not get Firestore instance from admin SDK:', error);
}

export { adminDb };
