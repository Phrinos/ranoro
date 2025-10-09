"use strict";
// functions/src/index.ts
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledCleanup = exports.runDataUnification = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK - THIS SHOULD BE DONE ONLY ONCE
if (admin.apps.length === 0) {
    admin.initializeApp();
}
// Import custom functions and scripts AFTER initialization
const migration_1 = require("./migration");
Object.defineProperty(exports, "runDataUnification", { enumerable: true, get: function () { return migration_1.runDataUnification; } });
// This is a sample function from the Firebase Quickstart
//
// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
// Scheduled function to clean up old data, for example
exports.scheduledCleanup = (0, scheduler_1.onSchedule)("every 24 hours", async (event) => {
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
