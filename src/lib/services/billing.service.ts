

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseClient";
import type { SaleReceipt, ServiceRecord } from "@/types";

type TicketType = SaleReceipt | ServiceRecord;

const findTicket = async (folio: string, total: number): Promise<TicketType | null> => {
  if (!db) throw new Error("Database not initialized.");
  
  const trimmedFolio = folio.trim().toUpperCase();

  let docRef;
  let collectionName: 'sales' | 'serviceRecords';

  if (trimmedFolio.startsWith('SALE-')) {
    collectionName = 'sales';
    docRef = doc(db, collectionName, trimmedFolio);
  } else {
    // Assume it's a service record if not a sale
    collectionName = 'serviceRecords';
    docRef = doc(db, collectionName, trimmedFolio);
  }

  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const ticketData = { id: docSnap.id, ...docSnap.data() } as TicketType;
  
  // Verify total amount
  const ticketTotal = 'totalAmount' in ticketData ? ticketData.totalAmount : ticketData.totalCost;
  
  // Use a small tolerance for floating point comparisons
  if (Math.abs(ticketTotal - total) > 0.01) {
    return null;
  }
  
  // Optional: Add check for already billed tickets if you have such a field
  // if (ticketData.isBilled) {
  //   throw new Error("Este ticket ya ha sido facturado.");
  // }

  return ticketData;
};

export const billingService = {
  findTicket,
};
