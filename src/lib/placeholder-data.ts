
import type { Vehicle, ServiceRecord, Technician, InventoryItem, DashboardMetrics, SaleReceipt, ServiceSupply, TechnicianMonthlyPerformance, InventoryCategory, Supplier, SaleItem, PaymentMethod, AppRole, QuoteRecord, MonthlyFixedExpense, AdministrativeStaff, User } from '@/types';
import { format, subMonths, addDays, getYear, getMonth, setHours, setMinutes, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

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

export const DATA_KEYS = {
    categories: 'placeholderCategories',
    suppliers: 'placeholderSuppliers',
    inventory: 'placeholderInventory',
    vehicles: 'placeholderVehicles',
    technicians: 'placeholderTechnicians',
    administrativeStaff: 'placeholderAdministrativeStaff',
    serviceRecords: 'placeholderServiceRecords',
    quotes: 'placeholderQuotes',
    sales: 'placeholderSales',
    fixedExpenses: 'placeholderFixedMonthlyExpenses',
    technicianPerformance: 'placeholderTechnicianMonthlyPerformance',
    appRoles: 'placeholderAppRoles',
};

const DATA_ARRAYS = {
    [DATA_KEYS.categories]: placeholderCategories,
    [DATA_KEYS.suppliers]: placeholderSuppliers,
    [DATA_KEYS.inventory]: placeholderInventory,
    [DATA_KEYS.vehicles]: placeholderVehicles,
    [DATA_KEYS.technicians]: placeholderTechnicians,
    [DATA_KEYS.administrativeStaff]: placeholderAdministrativeStaff,
    [DATA_KEYS.serviceRecords]: placeholderServiceRecords,
    [DATA_KEYS.quotes]: placeholderQuotes,
    [DATA_KEYS.sales]: placeholderSales,
    [DATA_KEYS.fixedExpenses]: placeholderFixedMonthlyExpenses,
    [DATA_KEYS.technicianPerformance]: placeholderTechnicianMonthlyPerformance,
    [DATA_KEYS.appRoles]: placeholderAppRoles,
};

/**
 * Carga todos los datos de la aplicación desde localStorage.
 * Solo se ejecuta una vez por sesión en el lado del cliente.
 */
export function hydrateFromLocalStorage() {
  if (typeof window === 'undefined' || (window as any).__APP_HYDRATED__) {
    return;
  }

  console.log("Hydrating application data from localStorage...");

  for (const key in DATA_KEYS) {
      const storageKey = DATA_KEYS[key as keyof typeof DATA_KEYS];
      const targetArray = DATA_ARRAYS[storageKey];
      
      try {
          const storedData = localStorage.getItem(storageKey);
          if (storedData) {
              const parsedData = JSON.parse(storedData);
              if (Array.isArray(parsedData)) {
                  // Limpia el array en memoria y lo llena con los datos de localStorage
                  targetArray.splice(0, targetArray.length, ...parsedData);
              }
          }
      } catch (e) {
          console.error(`Error hydrating ${storageKey}:`, e);
      }
  }

  (window as any).__APP_HYDRATED__ = true;
}

/**
 * Guarda todos los datos de la aplicación en localStorage.
 */
export function persistToLocalStorage() {
  if (typeof window === 'undefined') {
    return;
  }
  
  console.log("Persisting application data to localStorage...");

  for (const key in DATA_KEYS) {
    const storageKey = DATA_KEYS[key as keyof typeof DATA_KEYS];
    const sourceArray = DATA_ARRAYS[storageKey];
    try {
        localStorage.setItem(storageKey, JSON.stringify(sourceArray));
    } catch (e) {
        console.error(`Error persisting ${storageKey}:`, e);
    }
  }
}

/**
 * Gathers all data from memory into a single object for backup.
 */
export function getAllData() {
  const allData: { [key: string]: any[] } = {};
  for (const key in DATA_KEYS) {
    const storageKey = DATA_KEYS[key as keyof typeof DATA_KEYS];
    const sourceArray = DATA_ARRAYS[storageKey];
    allData[storageKey] = sourceArray;
  }
  return allData;
}

/**
 * Restores all data from a backup object and persists it.
 */
export function restoreAllData(backupData: { [key: string]: any[] }) {
  for (const key in DATA_KEYS) {
    const storageKey = DATA_KEYS[key as keyof typeof DATA_KEYS];
    const targetArray = DATA_ARRAYS[storageKey];
    if (backupData[storageKey] && Array.isArray(backupData[storageKey])) {
      // Clear the in-memory array and fill it with backup data
      targetArray.splice(0, targetArray.length, ...backupData[storageKey]);
    }
  }
  // After restoring to memory, persist immediately to localStorage
  persistToLocalStorage();
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
