

import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord } from "@/types";

const onAgendaUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
    if (!db) return () => {};
    
    const q = query(
        collection(db, "serviceRecords"), 
        where("status", "==", "Agendado")
    );

    return onSnapshot(q, (snapshot) => {
        const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceRecord));
        
        services.sort((a, b) => {
            const dateA = a.appointmentDateTime ? new Date(a.appointmentDateTime) : (a.serviceDate ? new Date(a.serviceDate) : null);
            const dateB = b.appointmentDateTime ? new Date(b.appointmentDateTime) : (b.serviceDate ? new Date(b.serviceDate) : null);
            if (dateA && dateB) return dateA.getTime() - dateB.getTime(); // Ascending for agenda
            if (dateA) return -1;
            if (dateB) return 1;
            return 0;
        });

        callback(services);
    }, (error) => {
        console.error("Error listening to agenda services:", error.message);
        callback([]);
    });
};

export const agendaService = {
    onAgendaUpdate,
};
