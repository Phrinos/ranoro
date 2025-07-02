"use server";

import { adminDb } from "@/lib/firebaseAdmin";

export async function savePublicDocument(
  collection: "publicQuotes" | "publicServices",
  id: string,
  data: any
) {
  try {
    await adminDb.collection(collection).doc(id).set(data, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Failed to save public document:", error);
    return { success: false, error: "Failed to save document." };
  }
}
