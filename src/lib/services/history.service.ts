
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord } from "@/types";

const onHistoryUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
    if (!db) return () => {};
    
    // 1. Query for all relevant statuses.
    const q = query(
        collection(db, "serviceRecords"), 
        where("status", "in", ["Entregado", "Cancelado"])
    );

    return onSnapshot(q, (snapshot) => {
        const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
        
        // 2. Sort on the client-side.
        services.sort((a, b) => {
            const dateA = a.deliveryDateTime ? new Date(a.deliveryDateTime) : 0;
            const dateB = b.deliveryDateTime ? new Date(b.deliveryDateTime) : 0;
            if (dateA && dateB) return dateB.getTime() - dateA.getTime(); // Descending for history
            return 0;
        });

        callback(services);
    }, (error) => {
        console.error("Error listening to history services:", error.message);
        callback([]);
    });
};

export const historyService = {
    onHistoryUpdate,
};
