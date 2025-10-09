// functions/src/index.ts
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK - THIS SHOULD BE DONE ONLY ONCE
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Import custom functions and scripts
// import { runDataUnification } from "./migration";
// export { runDataUnification };

// This is a sample function from the Firebase Quickstart
//
// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Scheduled function to clean up old data, for example
export const scheduledCleanup = onSchedule("every 24 hours", async (event) => {
  logger.info("Running scheduled cleanup job");
  // Add your cleanup logic here, e.g., deleting old records
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30); // 30 days ago

  const oldRecords = await admin
    .firestore()
    .collection("someCollection")
    .where("timestamp", "<", cutoff)
    .get();

  const batch = admin.firestore().batch();
  oldRecords.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  logger.log("Cleanup finished.");
});
