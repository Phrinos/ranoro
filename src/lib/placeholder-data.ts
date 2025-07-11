
import type {
  Vehicle,
  ServiceRecord,
  Technician,
  InventoryItem,
  SaleReceipt,
  InventoryCategory,
  Supplier,
  AppRole,
  QuoteRecord,
  MonthlyFixedExpense,
  AdministrativeStaff,
  User,
  VehiclePriceList,
  Driver,
  RentalPayment,
  PublicOwnerReport,
  OwnerWithdrawal,
  VehicleExpense,
  CashDrawerTransaction,
  InitialCashBalance,
  AuditLog,
  ServiceTypeRecord,
} from '@/types';
import { db } from '@/lib/firebaseClient.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { sanitizeObjectForFirestore } from './utils';

export const IVA_RATE = 0.16;
export const AUTH_USER_LOCALSTORAGE_KEY = 'authUser';

// =======================================
// ===          DATA ARRAYS            ===
// =======================================
export let placeholderCategories: InventoryCategory[] = [];
export let placeholderServiceTypes: ServiceTypeRecord[] = [];
export let placeholderSuppliers: Supplier[] = [];
export let placeholderInventory: InventoryItem[] = [];
export let placeholderVehicles: Vehicle[] = [];
export let placeholderTechnicians: Technician[] = [];
export let placeholderAdministrativeStaff: AdministrativeStaff[] = [];
export let placeholderDrivers: Driver[] = [];
export let placeholderRentalPayments: RentalPayment[] = [];
export let placeholderOwnerWithdrawals: OwnerWithdrawal[] = [];
export let placeholderVehicleExpenses: VehicleExpense[] = [];
export let placeholderUsers: User[] = [];
export let placeholderAppRoles: AppRole[] = [];
export let placeholderAuditLogs: AuditLog[] = [];
export let placeholderServiceRecords: ServiceRecord[] = [];
export let placeholderSales: SaleReceipt[] = [];
export let placeholderFixedMonthlyExpenses: MonthlyFixedExpense[] = [];
export let placeholderCashDrawerTransactions: CashDrawerTransaction[] = [];
export let placeholderInitialCashBalance: InitialCashBalance | null = null;
export let placeholderVehiclePriceLists: VehiclePriceList[] = [];
export let placeholderPublicOwnerReports: PublicOwnerReport[] = [];

// =======================================
// ===    DEFAULT SUPERADMIN CONFIG    ===
// =======================================
export const defaultSuperAdmin: User = {
  id: 'H0XVkuViOFM7zt729AyAK531iIj2',
  name: 'Arturo Valdelamar',
  email: 'arturo@ranoro.mx',
  role: 'Superadmin',
};

// =======================================
// === DATA PERSISTENCE & HYDRATION    ===
// =======================================
const DATA_STORE_ID = "main";

const DATA_ARRAYS = {
    vehicles: placeholderVehicles,
    serviceRecords: placeholderServiceRecords,
    technicians: placeholderTechnicians,
    inventory: placeholderInventory,
    categories: placeholderCategories,
    suppliers: placeholderSuppliers,
    sales: placeholderSales,
    appRoles: placeholderAppRoles,
    fixedExpenses: placeholderFixedMonthlyExpenses,
    administrativeStaff: placeholderAdministrativeStaff,
    vehiclePriceLists: placeholderVehiclePriceLists,
    drivers: placeholderDrivers,
    rentalPayments: placeholderRentalPayments,
    ownerWithdrawals: placeholderOwnerWithdrawals,
    vehicleExpenses: placeholderVehicleExpenses,
    cashDrawerTransactions: placeholderCashDrawerTransactions,
    initialCashBalance: placeholderInitialCashBalance,
    auditLogs: placeholderAuditLogs,
    serviceTypes: placeholderServiceTypes,
    users: placeholderUsers,
};

let resolveHydration: () => void;
export const hydrateReady = new Promise<void>((res) => {
  resolveHydration = res;
});

export async function hydrateFromFirestore() {
  // Prevent re-hydration
  if (typeof window !== 'undefined' && (window as any).__APP_HYDRATED__) {
    resolveHydration?.();
    return;
  }
  
  if (!db) {
    console.error("Hydration skipped: Firestore client is not available.");
    resolveHydration?.();
    return;
  }

  const mainDataDocRef = doc(db, 'database', DATA_STORE_ID);
  
  try {
    const docSnap = await getDoc(mainDataDocRef);
    if (docSnap.exists()) {
      const firestoreData = docSnap.data();
      for (const key of Object.keys(DATA_ARRAYS)) {
          const typedKey = key as keyof typeof DATA_ARRAYS;
          if (firestoreData[typedKey] !== undefined) {
              const placeholder = DATA_ARRAYS[typedKey];
              if (Array.isArray(placeholder)) {
                  // Replace array content without changing reference
                  placeholder.splice(0, placeholder.length, ...firestoreData[typedKey]);
              } else if (placeholder !== null && typeof placeholder === 'object') {
                  // Replace object content
                  Object.assign(placeholder, firestoreData[typedKey]);
              } else {
                  // For primitive types or null
                  (DATA_ARRAYS as any)[typedKey] = firestoreData[typedKey];
              }
          }
      }
      console.log('Main data successfully hydrated from Firestore.');
    } else {
       console.warn('Main data document not found. App will start with empty arrays. First save will create it.');
    }
  } catch (error) {
    console.error('Error reading main data from Firestore:', error);
  }

  if (typeof window !== 'undefined') {
    (window as any).__APP_HYDRATED__ = true;
  }
  resolveHydration?.();
}

export async function persistToFirestore(
  keysToUpdate?: (keyof typeof DATA_ARRAYS)[]
) {
  if (!db) {
    console.warn('Persist skipped: Firebase not configured.');
    return;
  }

  const keys = keysToUpdate && keysToUpdate.length > 0 ? keysToUpdate : Object.keys(DATA_ARRAYS) as (keyof typeof DATA_ARRAYS)[];
  
  const dataToPersist: { [key: string]: any } = {};
  for (const key of keys) {
    const dataArray = DATA_ARRAYS[key as keyof typeof DATA_ARRAYS];
    if (dataArray !== undefined) {
      dataToPersist[key] = dataArray;
    }
  }
  
  const sanitizedData = sanitizeObjectForFirestore(dataToPersist);
  try {
    const docRef = doc(db, 'database', DATA_STORE_ID);
    await setDoc(docRef, sanitizedData, { merge: true });
    
    console.log(`Data successfully persisted to Firestore on keys: ${keys.join(', ')}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('databaseUpdated'));
    }
  } catch (e) {
    console.error('Error persisting data to Firestore:', e);
  }
}

// =======================================
// ===          UTILITIES              ===
// =======================================

export async function logAudit(
  actionType: AuditLog['actionType'],
  description: string,
  details: { entityType?: AuditLog['entityType']; entityId?: string; } = {}
) {
    let userId = 'system';
    let userName = 'Sistema';
    try {
      const authUserString = localStorage.getItem(AUTH_USER_LOCALSTORAGE_KEY);
      if (authUserString) {
        const currentUser: User = JSON.parse(authUserString);
        userId = currentUser.id;
        userName = currentUser.name;
      }
    } catch (e) { console.error("Could not get user for audit log:", e); }

  const newLog: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    date: new Date().toISOString(),
    userId,
    userName,
    actionType,
    description,
    entityType: details.entityType,
    entityId: details.entityId,
  };
  placeholderAuditLogs.unshift(newLog);
}

export const calculateSaleProfit = (
  sale: SaleReceipt,
  inventory: InventoryItem[]
): number => {
  if (!sale?.items?.length) return 0;

  const inventoryMap = new Map<string, InventoryItem>(inventory.map((i) => [i.id, i]));
  let totalCost = 0;

  for (const saleItem of sale.items) {
    const inventoryItem = inventoryMap.get(saleItem.inventoryItemId);
    if (inventoryItem && !inventoryItem.isService) {
      totalCost += (inventoryItem.unitPrice || 0) * saleItem.quantity;
    }
  }
  
  const totalAmountPreTax = sale.totalAmount / (1 + IVA_RATE);
  const profit = totalAmountPreTax - totalCost;
  
  return isFinite(profit) ? profit : 0;
};
