
import type { Vehicle, ServiceRecord, Technician, InventoryItem, DashboardMetrics, SaleReceipt, ServiceSupply, TechnicianMonthlyPerformance, InventoryCategory, Supplier, SaleItem, PaymentMethod, AppRole, QuoteRecord, MonthlyFixedExpense, AdministrativeStaff, User } from '@/types';
import { format, subMonths, addDays, getYear, getMonth, setHours, setMinutes, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '@root/lib/firebaseClient.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';


const STATIC_NOW = new Date(); // Use real time for production
export const IVA_RATE = 0.16;

// =======================================
// ===          CATEGORÍAS Y PROVEEDORES          ===
// =======================================
export let placeholderCategories: InventoryCategory[] = [];

export let placeholderSuppliers: Supplier[] = [];

// =======================================
// ===          INVENTARIO          ===
// =======================================
export let placeholderInventory: InventoryItem[] = [];

// =======================================
// ===          VEHÍCULOS          ===
// =======================================
export let placeholderVehicles: Vehicle[] = [];

// =======================================
// ===          PERSONAL          ===
// =======================================
export let placeholderTechnicians: Technician[] = [];

export let placeholderAdministrativeStaff: AdministrativeStaff[] = [];

// =======================================
// ===          USUARIOS Y ROLES         ===
// =======================================
export const defaultSuperAdmin: User = {
  id: 'RaMVBO4UZeTeNW1BZlmwWMg9Na32',
  name: 'Arturo Valdelamar',
  email: 'arturo@ranoro.mx',
  role: 'Superadmin',
  password: 'CA1abaza',
  phone: '4493930914'
};

export const newUserAdmin: User = {
  id: 'KTZCiJCsOiTm1RVCTSQ9zdNcdxm2',
  name: 'Panda Computacion',
  email: 'pandacomputacion@gmail.com',
  role: 'Admin',
  password: 'CA1abaza',
};

export const dianaArriagaUser: User = {
  id: 'd1AnAArr1agaAdm1nRan0r0MX2025',
  name: 'Diana Arriaga',
  email: 'diana.arriaga@ranoro.mx',
  role: 'Admin',
  password: 'Ranoro2025',
};

export let placeholderUsers: User[] = [defaultSuperAdmin, newUserAdmin, dianaArriagaUser]; // This will be hydrated from Firestore
export const AUTH_USER_LOCALSTORAGE_KEY = 'authUser';
export const USER_LOCALSTORAGE_KEY = 'appUsers';
export const ROLES_LOCALSTORAGE_KEY = 'appRoles';

// =======================================
// ===          OPERACIONES          ===
// =======================================

// --- SERVICIOS ---
export let placeholderServiceRecords: ServiceRecord[] = [];

// --- COTIZACIONES ---
export let placeholderQuotes: QuoteRecord[] = [];

// --- VENTAS (POS) ---
export let placeholderSales: SaleReceipt[] = [];

// --- GASTOS FIJOS ---
export let placeholderFixedMonthlyExpenses: MonthlyFixedExpense[] = [];

// --- DATOS SIMULADOS (BORRAR O REEMPLAZAR) ---
export const placeholderDashboardMetrics: DashboardMetrics = {
  activeServices: 0,
  technicianEarnings: 0,
  dailyRevenue: 0,
  lowStockAlerts: 0,
};

export let placeholderTechnicianMonthlyPerformance: TechnicianMonthlyPerformance[] = [];

export let placeholderAppRoles: AppRole[] = [];

// =======================================
// ===  LÓGICA DE PERSISTENCIA DE DATOS  ===
// =======================================

const DB_PATH = 'database/main'; // The single document in Firestore to hold all data

const DATA_ARRAYS = {
    categories: placeholderCategories,
    suppliers: placeholderSuppliers,
    inventory: placeholderInventory,
    vehicles: placeholderVehicles,
    technicians: placeholderTechnicians,
    administrativeStaff: placeholderAdministrativeStaff,
    users: placeholderUsers,
    serviceRecords: placeholderServiceRecords,
    quotes: placeholderQuotes,
    sales: placeholderSales,
    fixedExpenses: placeholderFixedMonthlyExpenses,
    technicianPerformance: placeholderTechnicianMonthlyPerformance,
    appRoles: placeholderAppRoles,
};

/**
 * Loads all application data from a single Firestore document.
 * This function is now more resilient to read failures.
 */
export async function hydrateFromFirestore() {
  if (typeof window === 'undefined' || (window as any).__APP_HYDRATED__) {
    return;
  }

  console.log("Attempting to hydrate application data from Firestore...");
  const docRef = doc(db, DB_PATH);
  let docSnap;
  let changesMade = false;

  try {
    docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("Firestore document found. Hydrating from snapshot.");
      const firestoreData = docSnap.data();
      for (const key in DATA_ARRAYS) {
        if (firestoreData[key] && Array.isArray(firestoreData[key])) {
          const targetArray = DATA_ARRAYS[key as keyof typeof DATA_ARRAYS];
          targetArray.splice(0, targetArray.length, ...firestoreData[key]);
        }
      }
    } else {
      console.warn("No database document found. The application will be seeded with initial data.");
    }
  } catch (error) {
    console.error("Error reading from Firestore:", error);
    console.warn("Could not read from Firestore. This might be due to Firestore rules. The app will proceed with in-memory data for this session.");
  }

  // --- DATA INTEGRITY CHECKS ---
  // Always ensure default users exist in memory, regardless of what was loaded from the database.
  // This makes the app resilient to a corrupted or empty 'users' array in the DB.
  if (!placeholderUsers.some(u => u.id === defaultSuperAdmin.id)) {
    placeholderUsers.unshift(defaultSuperAdmin);
    changesMade = true;
    console.log(`Default user '${defaultSuperAdmin.email}' was missing and has been added to the current session.`);
  }
  if (!placeholderUsers.some(u => u.id === newUserAdmin.id)) {
    placeholderUsers.push(newUserAdmin);
    changesMade = true;
    console.log(`Default user '${newUserAdmin.email}' was missing and has been added to the current session.`);
  }
  if (!placeholderUsers.some(u => u.id === dianaArriagaUser.id)) {
    placeholderUsers.push(dianaArriagaUser);
    changesMade = true;
    console.log(`Default user '${dianaArriagaUser.email}' was missing and has been added to the current session.`);
  }
  
  (window as any).__APP_HYDRATED__ = true;
  console.log("Hydration process complete. Checking for necessary persistence...");

  // If the document didn't exist or we had to add a missing user, we should try to persist.
  if (!docSnap || !docSnap.exists() || changesMade) {
    console.log("Attempting to persist updated data to Firestore in the background...");
    // We don't await this so that the app can continue loading without waiting for the write to finish.
    // This is a "fire-and-forget" operation for faster startup.
    persistToFirestore().catch(err => {
        console.error("Background persistence failed:", err);
    });
  }
}


/**
 * Saves the entire application state from memory to a single Firestore document.
 */
export async function persistToFirestore() {
  // Do not persist if hydration hasn't occurred, to avoid overwriting cloud data with empty arrays.
  if (typeof window === 'undefined' || !(window as any).__APP_HYDRATED__) {
    console.warn("Persist skipped: App not yet hydrated.");
    return;
  }
  
  console.log("Persisting application data to Firestore...");

  const allData: { [key: string]: any[] } = {};
  for (const key in DATA_ARRAYS) {
      allData[key] = DATA_ARRAYS[key as keyof typeof DATA_ARRAYS];
  }

  try {
    await setDoc(doc(db, DB_PATH), allData);
    console.log("Data successfully persisted to Firestore.");
  } catch (e) {
    console.error("Error persisting data to Firestore:", e);
  }
}


// =======================================
// ===          FUNCIONES HELPER         ===
// =======================================
export const getCurrentMonthRange = () => {
    return { from: startOfMonth(STATIC_NOW), to: endOfMonth(STATIC_NOW) };
};

export const getLastMonthRange = () => {
    const lastMonthDate = subMonths(STATIC_NOW, 1);
    return { from: startOfMonth(lastMonthDate), to: endOfMonth(lastMonthDate) };
};

export const getTodayRange = () => {
    return { from: startOfDay(STATIC_NOW), to: endOfDay(STATIC_NOW) };
};

export const getYesterdayRange = () => {
    const yesterday = subDays(STATIC_NOW, 1);
    return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
};

export const calculateSaleProfit = (sale: SaleReceipt, inventory: InventoryItem[], ivaRate: number): number => {
  return sale.items.reduce((profit, saleItem) => {
      const inventoryItem = inventory.find(inv => inv.id === saleItem.inventoryItemId);
      const costPrice = inventoryItem ? inventoryItem.unitPrice : 0;
      const sellingPriceSubTotal = saleItem.unitPrice / (1 + ivaRate);
      return profit + (sellingPriceSubTotal - costPrice) * saleItem.quantity;
  }, 0);
};
