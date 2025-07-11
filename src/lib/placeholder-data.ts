
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
import { db } from './firebaseClient';
import { collection, onSnapshot, getDoc, doc } from 'firebase/firestore';

export const IVA_RATE = 0.16;
export const AUTH_USER_LOCALSTORAGE_KEY = 'authUser';

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
// ===     IN-MEMORY DATA ARRAYS       ===
// =======================================
// These arrays will be populated by the `hydrateFromFirestore` function.
// They act as an in-memory cache for the application's data.

export let placeholderVehicles: Vehicle[] = [];
export let placeholderServiceRecords: ServiceRecord[] = [];
export let placeholderTechnicians: Technician[] = [];
export let placeholderInventory: InventoryItem[] = [];
export let placeholderSales: SaleReceipt[] = [];
export let placeholderCategories: InventoryCategory[] = [];
export let placeholderSuppliers: Supplier[] = [];
export let placeholderAppRoles: AppRole[] = [];
export let placeholderFixedMonthlyExpenses: MonthlyFixedExpense[] = [];
export let placeholderAdministrativeStaff: AdministrativeStaff[] = [];
export let placeholderUsers: User[] = [];
export let placeholderVehiclePriceLists: VehiclePriceList[] = [];
export let placeholderDrivers: Driver[] = [];
export let placeholderRentalPayments: RentalPayment[] = [];
export let placeholderVehicleExpenses: VehicleExpense[] = [];
export let placeholderCashDrawerTransactions: CashDrawerTransaction[] = [];
export let placeholderInitialCashBalance: InitialCashBalance = { date: '', amount: 0, userId: '', userName: '' };
export let placeholderTechnicianMonthlyPerformance: any[] = [];
export let placeholderAuditLogs: AuditLog[] = [];
export let placeholderServiceTypes: ServiceTypeRecord[] = [];


// A simple promise to signal when the initial data load is complete.
export let hydrateReady: Promise<void>;
let _hydrateResolve: () => void;
hydrateReady = new Promise(resolve => {
  _hydrateResolve = resolve;
});

const WORKSHOP_DATA_DOC_ID = 'ranoroData'; // The single document ID for all workshop data

export const hydrateFromFirestore = async (): Promise<void> => {
  if (!db) {
    console.error("Firestore DB is not initialized.");
    return Promise.reject("Firestore DB is not initialized.");
  }

  try {
    const docRef = doc(db, "workshopData", WORKSHOP_DATA_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Populate each array, ensuring they are arrays even if missing from DB
      placeholderVehicles = data.vehicles || [];
      placeholderServiceRecords = data.serviceRecords || [];
      placeholderTechnicians = data.technicians || [];
      placeholderInventory = data.inventory || [];
      placeholderSales = data.sales || [];
      placeholderCategories = data.categories || [];
      placeholderSuppliers = data.suppliers || [];
      placeholderAppRoles = data.appRoles || [];
      placeholderFixedMonthlyExpenses = data.fixedExpenses || [];
      placeholderAdministrativeStaff = data.administrativeStaff || [];
      placeholderUsers = data.users || [];
      placeholderVehiclePriceLists = data.vehiclePriceLists || [];
      placeholderDrivers = data.drivers || [];
      placeholderRentalPayments = data.rentalPayments || [];
      placeholderVehicleExpenses = data.vehicleExpenses || [];
      placeholderCashDrawerTransactions = data.cashDrawerTransactions || [];
      placeholderInitialCashBalance = data.initialCashBalance || { date: '', amount: 0, userId: '', userName: '' };
      placeholderAuditLogs = data.auditLogs || [];
      placeholderServiceTypes = data.serviceTypes || [];

      console.log("Data hydrated successfully from Firestore document.");
    } else {
      console.warn("Workshop data document does not exist. App will start with empty data.");
      // Ensure arrays are empty if the document doesn't exist
      placeholderVehicles = [];
      placeholderServiceRecords = [];
      placeholderTechnicians = [];
      // ... and so on for all other arrays
    }
  } catch (error) {
    console.error("Error hydrating data from Firestore: ", error);
    // Potentially reject the promise to handle the error in the UI
    return Promise.reject(error);
  }

  // Resolve the promise to unblock the UI
  if (_hydrateResolve) {
    _hydrateResolve();
  }
};


export const persistToFirestore = async (collectionsToSave: (keyof typeof allDataArrays)[]) => {
  if (!db) {
    console.error("Firestore DB is not initialized. Cannot persist data.");
    return;
  }
  
  // This object maps keys to their corresponding arrays in this module.
  const allDataArrays = {
    vehicles: placeholderVehicles,
    serviceRecords: placeholderServiceRecords,
    technicians: placeholderTechnicians,
    inventory: placeholderInventory,
    sales: placeholderSales,
    categories: placeholderCategories,
    suppliers: placeholderSuppliers,
    appRoles: placeholderAppRoles,
    fixedExpenses: placeholderFixedMonthlyExpenses,
    administrativeStaff: placeholderAdministrativeStaff,
    users: placeholderUsers,
    vehiclePriceLists: placeholderVehiclePriceLists,
    drivers: placeholderDrivers,
    rentalPayments: placeholderRentalPayments,
    vehicleExpenses: placeholderVehicleExpenses,
    cashDrawerTransactions: placeholderCashDrawerTransactions,
    initialCashBalance: placeholderInitialCashBalance,
    auditLogs: placeholderAuditLogs,
    serviceTypes: placeholderServiceTypes,
  };

  const dataToUpdate: { [key: string]: any } = {};
  collectionsToSave.forEach(key => {
    dataToUpdate[key] = allDataArrays[key];
  });
  
  try {
    const docRef = doc(db, "workshopData", WORKSHOP_DATA_DOC_ID);
    await setDoc(docRef, dataToUpdate, { merge: true }); // Use merge: true to avoid overwriting other fields
    console.log(`Successfully persisted: ${collectionsToSave.join(', ')}`);
    // Dispatch a custom event to notify components of the update
    window.dispatchEvent(new CustomEvent('databaseUpdated'));
  } catch (error) {
    console.error("Error persisting data to Firestore: ", error);
  }
};


// =======================================
// ===          UTILITIES              ===
// =======================================

export function logAudit(
  actionType: AuditLog['actionType'],
  description: string,
  details: { entityType?: AuditLog['entityType']; entityId?: string; } = {}
): AuditLog {
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
  
  // Append to the in-memory log array
  placeholderAuditLogs.push(newLog);

  return newLog;
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
