// src/services/quotes.ts
import { db } from "@/firebaseConfig";
import { collection, doc, setDoc, getDoc } from "firebase/firestore";

// Guarda una cotización
export async function saveQuote(quote) {
  // quotes / COT0001
  await setDoc(doc(db, "quotes", quote.id), quote);
}

// Obtiene una cotización por ID
export async function getQuote(id) {
  const snap = await getDoc(doc(db, "quotes", id));
  return snap.exists() ? snap.data() : null;
}
