
import type { Vehicle, ServiceRecord, Technician, InventoryItem, DashboardMetrics, SaleReceipt, ServiceSupply, TechnicianMonthlyPerformance, InventoryCategory, Supplier, SaleItem, PaymentMethod, AppRole, QuoteRecord, MonthlyFixedExpense, AdministrativeStaff, User } from '@/types';
import { format, subMonths, addDays, getYear, getMonth, setHours, setMinutes, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { db } from '../../lib/firebaseClient';
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
  id: 'user_superadmin_default',
  name: 'Arturo Valdelamar',
  email: 'arturo@ranoro.mx',
  role: 'Superadmin',
  password: 'CA1abaza',
  phone: '4493930914'
};

export const USER_LOCALSTORAGE_KEY = 'appUsers';
export const AUTH_USER_LOCALSTORAGE_KEY = 'authUser';
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
    serviceRecords: placeholderServiceRecords,
    quotes: placeholderQuotes,
    sales: placeholderSales,
    fixedExpenses: placeholderFixedMonthlyExpenses,
    technicianPerformance: placeholderTechnicianMonthlyPerformance,
    appRoles: placeholderAppRoles,
};

/**
 * Loads all application data from a single Firestore document.
 * Runs only once per session on the client side.
 */
export async function hydrateFromFirestore() {
  if (typeof window === 'undefined' || (window as any).__APP_HYDRATED__) {
    return;
  }

  console.log("Hydrating application data from Firestore...");

  const docRef = doc(db, DB_PATH);
  
  try {
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        for (const key in DATA_ARRAYS) {
            if (firestoreData[key] && Array.isArray(firestoreData[key])) {
                const targetArray = DATA_ARRAYS[key as keyof typeof DATA_ARRAYS];
                targetArray.splice(0, targetArray.length, ...firestoreData[key]);
            }
        }
        console.log("Data successfully hydrated from Firestore.");
    } else {
        console.log("No database document found. Seeding with initial data and persisting to Firestore.");
        // If no document exists, this is likely the first run ever.
        // We persist the initial (potentially empty) placeholder data.
        await persistToFirestore();
    }
  } catch (error) {
    console.error("Error hydrating data from Firestore:", error);
  }

  (window as any).__APP_HYDRATED__ = true;
}

/**
 * Saves the entire application state from memory to a single Firestore document.
 */
export async function persistToFirestore() {
  if (typeof window === 'undefined' || !(window as any).__APP_HYDRATED__) {
    // Do not persist if hydration hasn't occurred, to avoid overwriting cloud data with empty arrays.
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
