

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseClient";
import type { SaleReceipt, ServiceRecord } from "@/types";

type TicketType = SaleReceipt | ServiceRecord;

const findTicket = async (folio: string, total: number): Promise<TicketType | null> => {
  if (!db) throw new Error("Database not initialized.");
  
  const trimmedFolio = folio.trim();

  // Try fetching from both collections simultaneously
  const saleDocRef = doc(db, 'sales', trimmedFolio);
  const serviceDocRef = doc(db, 'serviceRecords', trimmedFolio);

  const [saleSnap, serviceSnap] = await Promise.all([
    getDoc(saleDocRef),
    getDoc(serviceDocRef)
  ]);

  let ticketData: TicketType | null = null;

  if (saleSnap.exists()) {
    const data = { id: saleSnap.id, ...saleSnap.data() } as SaleReceipt;
    if (Math.abs(data.totalAmount - total) < 0.01) {
      ticketData = data;
    }
  }

  // If not found in sales, check services
  if (!ticketData && serviceSnap.exists()) {
    const data = { id: serviceSnap.id, ...serviceSnap.data() } as ServiceRecord;
     if (Math.abs((data.totalCost || 0) - total) < 0.01) {
      ticketData = data;
    }
  }

  // Optional: Add check for already billed tickets if you have such a field
  if (ticketData && (ticketData as any).isBilled) {
     throw new Error("Este ticket ya ha sido facturado.");
  }

  return ticketData;
};

export const billingService = {
  findTicket,
};
