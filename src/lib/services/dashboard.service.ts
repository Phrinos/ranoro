import { doc, getDoc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebaseClient';
import type { ServiceRecord, SaleReceipt } from '@/types';
import { startOfDay, endOfDay } from 'date-fns';

const onDashboardStatsUpdate = (callback: (stats: any) => void): (() => void) => {
  if (!db) return () => {};
  const ref = doc(db, 'system', 'dashboard_stats');
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    } else {
      callback({ financialData: [], operationalData: { lineData: [], pieData: [] } });
    }
  });
};

const onSalesTodayUpdate = (callback: (sales: SaleReceipt[]) => void): (() => void) => {
  if (!db) return () => {};
  const todayStart = startOfDay(new Date()).toISOString();
  // Using ISO string comparison for date filtering
  const q = query(
    collection(db, 'sales'),
    where('saleDate', '>=', todayStart),
    orderBy('saleDate', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SaleReceipt)));
  });
};

const onServicesCompletedTodayUpdate = (callback: (services: ServiceRecord[]) => void): (() => void) => {
  if (!db) return () => {};
  const todayStart = startOfDay(new Date()).toISOString();
  
  const q = query(
      collection(db, 'serviceRecords'),
      where('deliveryDateTime', '>=', todayStart)
  );

  return onSnapshot(q, (snap) => {
    // Filter status in memory to avoid composite index requirement
    const services = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as ServiceRecord))
      .filter(s => s.status === 'Entregado');
    callback(services);
  }, (err) => {
      console.warn("Error getting compiled today services:", err);
      // Fallback if deliveryDateTime index isn't available
      const fallbackQ = query(
        collection(db, 'serviceRecords'),
        orderBy('createdAt', 'desc'),
      );
      // We can't safely fallback with unindexed large collections, so return empty 
      // but log it asking user to create the simple index.
      callback([]);
  });
};

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseClient';

const forceGenerateDashboardStats = async () => {
    const functions = getFunctions(app);
    const generateStats = httpsCallable(functions, 'forceGenerateDashboardStats');
    await generateStats();
};

export const dashboardService = {
  onDashboardStatsUpdate,
  onSalesTodayUpdate,
  onServicesCompletedTodayUpdate,
  forceGenerateDashboardStats
};
